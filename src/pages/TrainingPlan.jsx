import { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { getItem } from '../lib/storage'
import {
  getWorkoutForOffset,
  getWorkoutDuration,
  getPrimaryZone,
  getStructureSummary,
  getDateForOffset,
  getDayOffset,
  PLAN_START_DATE_DEFAULT,
  RACE_DAY_OFFSET,
  PLAN_END_OFFSET,
  HR_ZONES,
} from '../lib/trainingPlan'
import { Badge } from '../components/ui'

const zoneVariant = { 1: 'muted', 2: 'recovery', 3: 'warning', 4: 'accent', 5: 'danger' }

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ZoneBadge({ zone }) {
  if (!zone) return null
  const variant = zoneVariant[zone] || 'muted'
  const zoneName = HR_ZONES[zone]?.name || `Z${zone}`
  return (
    <Badge variant={variant} size="sm">
      Z{zone}
    </Badge>
  )
}

function DayRow({ day, onSelect }) {
  const { offset, date, workout, isRest, isToday, isPast, isRaceDay, inPlan } = day

  const duration = workout ? getWorkoutDuration(workout) : 0
  const zone = workout ? getPrimaryZone(workout) : null

  const dayLabel = DAY_LABELS[date.getDay()]
  const dayNum = format(date, 'd')

  // Row styling based on state
  let rowClasses =
    'flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer active:bg-white/5'

  if (isRaceDay) {
    rowClasses += ' bg-yellow-500/10 border-l-2 border-yellow-400'
  } else if (isToday) {
    rowClasses += ' bg-blue-500/10 border-l-2 border-blue-400'
  } else if (isPast) {
    rowClasses += ' opacity-50 border-l-2 border-transparent'
  } else {
    rowClasses += ' border-l-2 border-transparent'
  }

  const handleClick = () => {
    if (workout || isRaceDay) {
      onSelect(day)
    }
  }

  return (
    <div className={rowClasses} onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}>
      {/* Day label */}
      <div className="w-14 flex-shrink-0">
        <span className={`text-xs font-semibold ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
          {dayLabel} {dayNum}
        </span>
      </div>

      {/* Workout name / Rest */}
      <div className="flex-1 min-w-0">
        {isRaceDay ? (
          <span className="text-sm font-semibold text-yellow-400">Race Day — 47 mi</span>
        ) : isRest || !workout ? (
          <span className="text-sm text-gray-600">—</span>
        ) : (
          <span className={`text-sm font-medium truncate ${isToday ? 'text-gray-50' : 'text-gray-200'}`}>
            {workout.name}
          </span>
        )}
      </div>

      {/* Duration + zone */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isRaceDay ? (
          <Badge variant="warning" size="sm">Race</Badge>
        ) : isRest || !workout ? (
          <span className="text-xs text-gray-600">Rest</span>
        ) : (
          <>
            <span className="text-xs text-gray-400 tabular-nums">{duration} min</span>
            <ZoneBadge zone={zone} />
          </>
        )}
      </div>

      {/* Past checkmark */}
      {isPast && workout && (
        <div className="flex-shrink-0 ml-1">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      )}
    </div>
  )
}

function WeekSection({ weekData, currentWeek, onSelectDay }) {
  const { week, days } = weekData
  const isCurrent = week - 1 === currentWeek
  const isRaceWeek = days.some((d) => d.isRaceDay)

  // Week date range: first and last day in week
  const firstDay = days[0]
  const lastDay = days[days.length - 1]
  const rangeLabel = `${format(firstDay.date, 'MMM d')}–${format(lastDay.date, 'd')}`

  return (
    <div className="mb-4">
      {/* Week header */}
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-sm font-semibold text-gray-300">
          Week {week}
        </span>
        <span className="text-xs text-gray-500">· {rangeLabel}</span>
        {isCurrent && (
          <span className="ml-auto inline-flex items-center rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold px-2 py-0.5">
            Current
          </span>
        )}
        {isRaceWeek && !isCurrent && (
          <span className="ml-auto inline-flex items-center rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-semibold px-2 py-0.5">
            Race Week
          </span>
        )}
        {isRaceWeek && isCurrent && (
          <span className="ml-1 inline-flex items-center rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-semibold px-2 py-0.5">
            Race Week
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-700/60 mx-4 mb-1" />

      {/* Day rows */}
      <div className="bg-gray-800/40 rounded-xl mx-2 overflow-hidden border border-white/5">
        {days.map((day, i) => (
          <div key={day.offset}>
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
            const variant = zoneVariant[subZone] || 'muted'
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-xs text-gray-400">{sub.name}</span>
                <span className="text-xs text-gray-500 ml-auto">{subMins} min</span>
                <Badge variant={variant} size="sm">Z{subZone}</Badge>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const mins = Math.round(parseInt(step.duration, 10) / 60)
  const variant = zoneVariant[zone] || 'muted'

  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs text-gray-300 flex-1">{step.name}</span>
      <span className="text-xs text-gray-500">{mins} min</span>
      <Badge variant={variant} size="sm">Z{zone}</Badge>
    </div>
  )
}

function WorkoutSheet({ day, onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger slide-in on mount
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  if (!day) return null

  const { offset, date, workout, isRaceDay } = day
  const duration = workout ? getWorkoutDuration(workout) : null
  const zone = workout ? getPrimaryZone(workout) : null
  const summary = workout ? getStructureSummary(workout) : null
  const dayLabel = DAY_LABELS[date.getDay()]
  const dateStr = format(date, 'MMMM d, yyyy')

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-gray-900 rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto transition-transform duration-300 ease-out"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

        {/* Date */}
        <p className="text-xs text-gray-400 font-medium mb-1">{dayLabel} · {dateStr}</p>

        {isRaceDay ? (
          <div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">Race Day</h2>
            <p className="text-gray-300 text-sm">47-Mile Road Race. This is what you've been training for. Trust the process.</p>
          </div>
        ) : workout ? (
          <>
            {/* Workout name */}
            <h2 className="text-xl font-bold text-gray-50 mb-3">{workout.name}</h2>

            {/* Duration + zone */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
                <span className="text-sm text-gray-300 font-medium">{duration} min</span>
              </div>
              {zone && <ZoneBadge zone={zone} />}
            </div>

            {/* Structure summary */}
            {summary && (
              <div className="bg-gray-800 rounded-xl p-3 mb-4">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Structure</p>
                <p className="text-sm text-gray-200">{summary}</p>
              </div>
            )}

            {/* Description */}
            {workout.description && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-300 leading-relaxed">{workout.description}</p>
              </div>
            )}

            {/* Steps */}
            {workout.steps?.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Steps</p>
                <div className="bg-gray-800 rounded-xl p-3">
                  {workout.steps.map((step, i) => (
                    <WorkoutStepRow key={i} step={step} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-gray-50 mb-2">Rest Day</h2>
            <p className="text-gray-400 text-sm">Recovery is part of training. Give your body time to adapt.</p>
          </div>
        )}

        {/* Close button */}
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
  const todayOffset = getDayOffset(startDate)
  const currentWeek = Math.floor(Math.max(todayOffset, 0) / 7)

  const [selectedDay, setSelectedDay] = useState(null)

  // Build 11 weeks array
  const weeks = useMemo(() => {
    const result = []
    for (let w = 0; w < 11; w++) {
      const days = []
      for (let d = 0; d < 7; d++) {
        const offset = w * 7 + d
        if (offset > PLAN_END_OFFSET + 7) break
        const workout = getWorkoutForOffset(offset)
        const date = getDateForOffset(startDate, offset)
        days.push({
          offset,
          date,
          workout,
          isRest: workout === null,
          isToday: offset === todayOffset,
          isPast: offset < todayOffset,
          isRaceDay: offset === RACE_DAY_OFFSET,
          inPlan: offset <= PLAN_END_OFFSET,
        })
      }
      result.push({ week: w + 1, days })
    }
    return result
  }, [startDate, todayOffset])

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sticky header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-gray-900 z-10 border-b border-gray-800/60">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-50">Training Plan</h1>
          <span className="inline-flex items-center rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-semibold px-3 py-1">
            Week {Math.min(currentWeek + 1, 11)} of 11
          </span>
        </div>
      </div>

      {/* Scrollable week list */}
      <div className="pb-8 pt-3">
        {weeks.map((weekData) => (
          <WeekSection
            key={weekData.week}
            weekData={weekData}
            currentWeek={currentWeek}
            onSelectDay={setSelectedDay}
          />
        ))}
      </div>

      {/* Bottom sheet */}
      {selectedDay && (
        <WorkoutSheet
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}
