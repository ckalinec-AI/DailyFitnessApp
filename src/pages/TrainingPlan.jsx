import { useState, useMemo, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { getItem } from '../lib/storage'
import {
  getWorkoutDuration,
  getPrimaryZone,
  getStructureSummary,
  getDateForOffset,
  PLAN_START_DATE_DEFAULT,
  RACE_DAY_OFFSET,
  PLAN_END_OFFSET,
} from '../lib/trainingPlan'
import { useIntervals } from '../hooks/useIntervals'
import { Badge } from '../components/ui'

const zoneVariant = { 1: 'muted', 2: 'recovery', 3: 'warning', 4: 'accent', 5: 'danger' }
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ZoneBadge({ zone }) {
  if (!zone) return null
  return <Badge variant={zoneVariant[zone] || 'muted'} size="sm">Z{zone}</Badge>
}

// Convert an intervals.icu event into a normalized workout object
function eventToWorkout(evt) {
  if (!evt) return null
  return {
    name: evt.name || 'Workout',
    description: evt.description || '',
    duration: evt.moving_time ? Math.round(evt.moving_time / 60) : null,
    steps: [],
    _source: 'intervals',
  }
}

// Convert meters to miles, rounded to 1 decimal
function metersToMiles(m) {
  return m ? (m / 1609.34).toFixed(1) : null
}

function DayRow({ day, onSelect }) {
  const { date, workout, activity, isRest, isToday, isPast, isRaceDay } = day

  const duration = workout?.duration ?? (workout ? getWorkoutDuration(workout) : 0)
  const zone = (workout && workout._source !== 'intervals') ? getPrimaryZone(workout) : null

  const dayLabel = DAY_LABELS[date.getDay()]
  const dayNum = format(date, 'd')

  const hasActivity = Boolean(activity)
  const actMiles = hasActivity ? metersToMiles(activity.distance) : null

  let rowClasses = 'flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer active:bg-white/5'
  if (isRaceDay)     rowClasses += ' bg-yellow-500/10 border-l-2 border-yellow-400'
  else if (isToday)  rowClasses += ' bg-blue-500/10 border-l-2 border-blue-400'
  else if (isPast)   rowClasses += ' opacity-50 border-l-2 border-transparent'
  else               rowClasses += ' border-l-2 border-transparent'

  const handleClick = () => { if (workout || isRaceDay || activity) onSelect(day) }

  return (
    <div className={rowClasses} onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}>

      {/* Day label */}
      <div className="w-14 flex-shrink-0">
        <span className={`text-xs font-semibold ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
          {dayLabel} {dayNum}
        </span>
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {isRaceDay ? (
          <span className="text-sm font-semibold text-yellow-400">Race Day — 47 mi</span>
        ) : hasActivity ? (
          <span className="text-sm font-medium text-green-400 truncate">{activity.name}</span>
        ) : isRest || !workout ? (
          <span className="text-sm text-gray-600">—</span>
        ) : (
          <span className={`text-sm font-medium truncate ${isToday ? 'text-gray-50' : 'text-gray-200'}`}>
            {workout.name}
          </span>
        )}
      </div>

      {/* Right side: duration/miles + zone + check */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isRaceDay ? (
          <Badge variant="warning" size="sm">Race</Badge>
        ) : hasActivity ? (
          <>
            {actMiles && <span className="text-xs text-green-400 tabular-nums">{actMiles} mi</span>}
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </>
        ) : isRest || !workout ? (
          <span className="text-xs text-gray-600">Rest</span>
        ) : (
          <>
            {duration > 0 && <span className="text-xs text-gray-400 tabular-nums">{duration} min</span>}
            {zone && <ZoneBadge zone={zone} />}
          </>
        )}
      </div>
    </div>
  )
}

function WeekSection({ weekData, weekRef, onSelectDay }) {
  const { week, days, containsToday } = weekData
  const isCurrent = containsToday
  const isRaceWeek = days.some((d) => d.isRaceDay)
  const firstDay = days[0]
  const lastDay = days[days.length - 1]
  const rangeLabel = `${format(firstDay.date, 'MMM d')}–${format(lastDay.date, 'd')}`

  return (
    <div ref={weekRef} className="mb-4">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-sm font-semibold text-gray-300">Week {week}</span>
        <span className="text-xs text-gray-500">· {rangeLabel}</span>
        {isCurrent && (
          <span className="ml-auto inline-flex items-center rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold px-2 py-0.5">
            Current
          </span>
        )}
        {isRaceWeek && (
          <span className={`${isCurrent ? 'ml-1' : 'ml-auto'} inline-flex items-center rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-semibold px-2 py-0.5`}>
            Race Week
          </span>
        )}
      </div>
      <div className="h-px bg-gray-700/60 mx-4 mb-1" />
      <div className="bg-gray-800/40 rounded-xl mx-2 overflow-hidden border border-white/5">
        {days.map((day, i) => (
          <div key={day.dateStr}>
            {i > 0 && <div className="h-px bg-gray-700/30 mx-4" />}
            <DayRow day={day} onSelect={onSelectDay} />
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkoutStepRow({ step }) {
  const isRepeat = step.type === 'repeat' && step.subSteps?.length
  const zone = parseInt(step.startValue, 10)

  if (isRepeat) {
    return (
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-300">{step.name}</span>
          <Badge variant="muted" size="sm">{step.repeats}×</Badge>
        </div>
        <div className="ml-3 space-y-1">
          {step.subSteps.map((sub, i) => {
            const subZone = parseInt(sub.startValue, 10)
            const subMins = Math.round(parseInt(sub.duration, 10) / 60)
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-xs text-gray-400">{sub.name}</span>
                <span className="text-xs text-gray-500 ml-auto">{subMins} min</span>
                <Badge variant={zoneVariant[subZone] || 'muted'} size="sm">Z{subZone}</Badge>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const mins = Math.round(parseInt(step.duration, 10) / 60)
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs text-gray-300 flex-1">{step.name}</span>
      <span className="text-xs text-gray-500">{mins} min</span>
      <Badge variant={zoneVariant[zone] || 'muted'} size="sm">Z{zone}</Badge>
    </div>
  )
}

function WorkoutSheet({ day, onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const handleClose = () => { setVisible(false); setTimeout(onClose, 300) }

  if (!day) return null

  const { date, workout, activity, isRaceDay } = day
  const duration = workout?.duration ?? (workout ? getWorkoutDuration(workout) : null)
  const zone = (workout && workout._source !== 'intervals') ? getPrimaryZone(workout) : null
  const summary = (workout && workout._source !== 'intervals') ? getStructureSummary(workout) : null
  const actMiles = activity ? metersToMiles(activity.distance) : null
  const actDuration = activity?.moving_time ? Math.round(activity.moving_time / 60) : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />
      <div
        className="relative bg-gray-900 rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto transition-transform duration-300 ease-out"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
        <p className="text-xs text-gray-400 font-medium mb-1">
          {DAY_LABELS[date.getDay()]} · {format(date, 'MMMM d, yyyy')}
        </p>

        {isRaceDay ? (
          <div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">Race Day</h2>
            <p className="text-gray-300 text-sm">47-Mile Road Race. This is what you've been training for. Trust the process.</p>
          </div>
        ) : (
          <>
            {/* Completed activity */}
            {activity && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
                <p className="text-xs text-green-400 font-semibold uppercase tracking-wide mb-1">Completed</p>
                <p className="text-sm font-semibold text-green-300">{activity.name}</p>
                <div className="flex gap-4 mt-1.5 text-xs text-green-400/80">
                  {actMiles && <span>{actMiles} mi</span>}
                  {actDuration && <span>{actDuration} min</span>}
                  {activity.icu_training_load && <span>{Math.round(activity.icu_training_load)} TSS</span>}
                </div>
              </div>
            )}

            {workout ? (
              <>
                <h2 className="text-xl font-bold text-gray-50 mb-3">{workout.name}</h2>
                <div className="flex items-center gap-3 mb-4">
                  {duration && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                      </svg>
                      <span className="text-sm text-gray-300 font-medium">{duration} min</span>
                    </div>
                  )}
                  {zone && <ZoneBadge zone={zone} />}
                </div>

                {summary && (
                  <div className="bg-gray-800 rounded-xl p-3 mb-4">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Structure</p>
                    <p className="text-sm text-gray-200">{summary}</p>
                  </div>
                )}

                {workout.description && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{workout.description}</p>
                  </div>
                )}

                {workout.steps?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Steps</p>
                    <div className="bg-gray-800 rounded-xl p-3">
                      {workout.steps.map((step, i) => <WorkoutStepRow key={i} step={step} />)}
                    </div>
                  </div>
                )}
              </>
            ) : !activity ? (
              <div>
                <h2 className="text-xl font-bold text-gray-50 mb-2">Rest Day</h2>
                <p className="text-gray-400 text-sm">Recovery is part of training. Give your body time to adapt.</p>
              </div>
            ) : null}
          </>
        )}

        <button
          onClick={handleClose}
          className="mt-6 w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-200 font-medium text-sm py-3 rounded-xl transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default function TrainingPlan() {
  const startDate = getItem('planStartDate', PLAN_START_DATE_DEFAULT)
  const [selectedDay, setSelectedDay] = useState(null)
  const { eventsByDate, activitiesByDate, loading, error, lastSyncedMins, syncData } = useIntervals()

  const headerRef = useRef(null)
  const currentWeekRef = useRef(null)

  const weeks = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const raceDateStr = format(getDateForOffset(startDate, RACE_DAY_OFFSET), 'yyyy-MM-dd')

    // First Sunday on or before plan start
    const planStartObj = new Date(startDate + 'T12:00:00')
    const startDow = planStartObj.getDay()
    const firstSunday = new Date(planStartObj)
    firstSunday.setDate(firstSunday.getDate() - startDow)

    // Last Saturday on or after plan end
    const planEndObj = getDateForOffset(startDate, PLAN_END_OFFSET)
    const endDow = planEndObj.getDay()
    const lastSaturday = new Date(planEndObj)
    if (endDow !== 6) lastSaturday.setDate(lastSaturday.getDate() + (6 - endDow))

    const result = []
    const cursor = new Date(firstSunday)
    let weekNum = 1

    while (cursor <= lastSaturday) {
      const days = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(cursor)
        date.setDate(date.getDate() + d)
        const dateStr = format(date, 'yyyy-MM-dd')

        const evt = eventsByDate[dateStr] ?? null
        const workout = evt ? eventToWorkout(evt) : null
        const activity = activitiesByDate[dateStr] ?? null

        days.push({
          date,
          dateStr,
          workout,
          activity,
          isRest: !workout,
          isToday: dateStr === todayStr,
          isPast: dateStr < todayStr,
          isRaceDay: dateStr === raceDateStr,
        })
      }

      result.push({ week: weekNum, days, containsToday: days.some(d => d.isToday) })
      cursor.setDate(cursor.getDate() + 7)
      weekNum++
    }

    return result
  }, [startDate, eventsByDate, activitiesByDate])

  const currentWeekIndex = weeks.findIndex(w => w.containsToday)

  // Scroll current week to top on mount
  useEffect(() => {
    if (!currentWeekRef.current) return
    const timer = setTimeout(() => {
      const mainEl = document.querySelector('main')
      const headerEl = headerRef.current
      if (mainEl && currentWeekRef.current) {
        const headerHeight = headerEl?.offsetHeight ?? 0
        const containerRect = mainEl.getBoundingClientRect()
        const elRect = currentWeekRef.current.getBoundingClientRect()
        const targetScrollTop = mainEl.scrollTop + (elRect.top - containerRect.top) - headerHeight
        mainEl.scrollTop = Math.max(0, targetScrollTop)
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="bg-gray-900">
      {/* Sticky header */}
      <div ref={headerRef} className="px-4 pt-3 pb-4 sticky top-0 bg-gray-900 z-10 border-b border-gray-800/60">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-50">Training Plan</h1>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-semibold px-3 py-1">
              {currentWeekIndex >= 0 ? `Week ${currentWeekIndex + 1} of ${weeks.length}` : `${weeks.length} Weeks`}
            </span>
            <button
              onClick={syncData}
              disabled={loading}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
              title="Sync from Intervals.icu"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-600">
            {error
              ? <span className="text-yellow-600">{error}</span>
              : lastSyncedMins !== null
                ? `Synced from Intervals.icu ${lastSyncedMins}m ago`
                : 'Syncing from Intervals.icu...'}
          </p>
        </div>
      </div>

      {/* Scrollable week list */}
      <div className="pb-8 pt-3">
        {weeks.map((weekData) => (
          <WeekSection
            key={weekData.week}
            weekData={weekData}
            weekRef={weekData.containsToday ? currentWeekRef : null}
            onSelectDay={setSelectedDay}
          />
        ))}
      </div>

      {selectedDay && (
        <WorkoutSheet day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  )
}
