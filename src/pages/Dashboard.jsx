import { useState, useMemo, useRef, useCallback } from 'react'
import { format, differenceInCalendarDays } from 'date-fns'
import { usePlan } from '../hooks/usePlan'
import { useWhoop } from '../hooks/useWhoop'
import { useIntervals } from '../hooks/useIntervals'
import { useWeather } from '../hooks/useWeather'
import WorkoutChart, { parseWorkoutSegments } from '../components/ui/WorkoutChart'
import {
  Card,
  SectionHeader,
  MetricRing,
} from '../components/ui'

function ChevronIcon({ expanded }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function compassFromDeg(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

function formatDuration(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.round((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

export default function Dashboard() {
  const plan = usePlan()
  const whoop = useWhoop()
  const { events, eventsByDate, activitiesByDate } = useIntervals()

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayEvent = eventsByDate[todayStr] ?? null
  const todayActivity = activitiesByDate[todayStr] ?? null

  // Ride duration for the weather window
  const rideDurationMins = useMemo(() => {
    if (todayEvent?.moving_time > 0) return Math.round(todayEvent.moving_time / 60)
    return 60
  }, [todayEvent])

  const { weather, loading: weatherLoading, error: weatherError, refresh: refreshWeather } = useWeather({ rideDurationMins })
  const recovery = {
    score:    whoop.recoveryData?.score    ?? null,
    hrv:      whoop.recoveryData?.hrv      ?? null,
    rhr:      whoop.recoveryData?.rhr      ?? null,
    sleepPct: whoop.sleepData?.sleepPct    ?? null,
    strain:   whoop.strainData?.strain     ?? null,
    synced:   whoop.lastSyncedMins         ?? null,
  }
  const [todayExpanded, setTodayExpanded] = useState(false)

  // Pull-to-refresh
  const touchStartY = useRef(null)
  const [pullDist, setPullDist] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const PULL_THRESHOLD = 72

  const doRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.allSettled([whoop.syncData(), refreshWeather({ forceRefresh: true })])
    setRefreshing(false)
  }, [whoop, refreshWeather])

  function onTouchStart(e) {
    const mainEl = document.querySelector('main')
    if ((mainEl?.scrollTop ?? 0) === 0) touchStartY.current = e.touches[0].clientY
  }
  function onTouchMove(e) {
    if (touchStartY.current === null) return
    const dist = Math.max(0, e.touches[0].clientY - touchStartY.current)
    if (dist > 0) setPullDist(Math.min(dist, PULL_THRESHOLD * 1.5))
  }
  function onTouchEnd() {
    if (pullDist >= PULL_THRESHOLD) doRefresh()
    touchStartY.current = null
    setPullDist(0)
  }

  const { daysToRace } = plan
  const isRestDay = !todayActivity && !todayEvent && events.length > 0

  // Zone chart segments for today's planned workout
  const todaySegments = useMemo(() => {
    if (todayEvent?.description) {
      const parsed = parseWorkoutSegments(todayEvent.description)
      if (parsed.length) return parsed
    }
    return []
  }, [todayEvent])

  // Next upcoming workout from intervals.icu only
  const nextWorkoutData = useMemo(() => {
    const upcoming = events
      .filter(e => e.start_date_local && e.start_date_local.slice(0, 10) > todayStr)
      .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))

    if (upcoming.length === 0) return null

    const evt = upcoming[0]
    const dateStr = evt.start_date_local.slice(0, 10)
    const segments = parseWorkoutSegments(evt.description)
    const diff = differenceInCalendarDays(
      new Date(dateStr + 'T12:00:00'),
      new Date(todayStr + 'T12:00:00')
    )
    const dateLabel =
      diff === 1 ? 'Tomorrow'
      : diff < 7 ? format(new Date(dateStr + 'T12:00:00'), 'EEEE')
      : format(new Date(dateStr + 'T12:00:00'), 'MMM d')

    return { name: evt.name, dateStr, movingTime: evt.moving_time, segments, dateLabel }
  }, [events, todayStr])

  return (
    <div
      className="px-4 pt-3 pb-6 space-y-4"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="overflow-hidden transition-all duration-200 flex items-center justify-center text-gray-500 text-xs gap-1.5"
        style={{ height: refreshing ? 32 : pullDist > 8 ? Math.min(pullDist * 0.4, 32) : 0, opacity: refreshing || pullDist > 16 ? 1 : 0 }}
      >
        {refreshing ? (
          <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full" /> Refreshing…</>
        ) : (
          <span>{pullDist >= PULL_THRESHOLD ? '↑ Release to refresh' : '↓ Pull to refresh'}</span>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white tracking-tight">Kadence</h1>
        <p className="text-xs text-gray-400">{format(new Date(), 'EEEE, MMM d')}</p>
      </div>

      {/* Days to race countdown */}
      {daysToRace > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-xs text-gray-500 font-medium tracking-widest uppercase">
            {daysToRace} days to race
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
      )}

      {/* Recovery card */}
      <Card variant="glow">
        <div className="flex justify-around items-center py-2">
          <MetricRing
            value={recovery.sleepPct != null ? Math.round(recovery.sleepPct) : null}
            pct={recovery.sleepPct ?? 0}
            label="Sleep"
            color="#60A5FA"
            unit="%"
          />
          <MetricRing
            value={recovery.score != null ? Math.round(recovery.score) : null}
            pct={recovery.score ?? 0}
            label="Recovery"
            color={recovery.score == null ? '#6B7280' : recovery.score >= 67 ? '#10B981' : recovery.score >= 34 ? '#F59E0B' : '#EF4444'}
            unit="%"
          />
          <MetricRing
            value={recovery.strain != null ? Number(recovery.strain).toFixed(1) : null}
            pct={recovery.strain != null ? (recovery.strain / 21) * 100 : 0}
            label="Strain"
            color="#3B82F6"
          />
        </div>
        {whoop.connected
          ? whoop.error && (
              <p className="text-xs text-center mt-1">
                <span className="text-yellow-600/80">{whoop.error}</span>
              </p>
            )
          : (
              <p className="text-xs text-center mt-1">
                <button onClick={whoop.connect} className="text-blue-500 hover:text-blue-400 transition-colors">Connect Whoop →</button>
              </p>
            )
        }
      </Card>

      {/* Weather card */}
      <Card variant="default">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Weather</p>
          {weather?.windowLabel && (
            <p className="text-[10px] text-gray-600">{weather.windowLabel}</p>
          )}
        </div>
        {weatherLoading && !weather ? (
          <p className="text-sm text-gray-500 text-center py-2">Fetching weather…</p>
        ) : weatherError && !weather ? (
          <p className="text-sm text-yellow-600/80 text-center py-2">{weatherError}</p>
        ) : weather ? (
          <div className="flex justify-around items-start py-1">

            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-1 leading-none">
                <span className="text-lg leading-none">{weather.icon}</span>
                <span className="text-xl font-black text-white leading-none">
                  {weather.tempEnd != null && Math.abs(weather.tempEnd - weather.tempF) > 3
                    ? `${weather.tempF}–${weather.tempEnd}°`
                    : `${weather.tempF}°`}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest text-center leading-tight">{weather.condition}</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <span className="text-sm font-black text-white leading-tight text-center">
                {weather.cloudLabel ?? '—'}
              </span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Sky</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <span className="text-xl font-black text-white leading-none">{weather.windMph}<span className="text-xs font-semibold"> mph</span></span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{weather.windDir} Wind</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <span className="text-xl font-black text-white leading-none">{weather.precipPct}%</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Rain</span>
            </div>

            {weather.precipIn > 0 && (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xl font-black text-white leading-none">{weather.precipIn}"</span>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Expected</span>
              </div>
            )}

            {weather.stormDistanceMi != null && weather.stormDistanceMi < 75 && (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xl font-black text-white leading-none">
                  {Math.round(weather.stormDistanceMi)}<span className="text-xs font-semibold"> mi</span>
                </span>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                  {compassFromDeg(weather.stormBearing)} Storm
                </span>
              </div>
            )}

          </div>
        ) : null}
      </Card>

      {/* Today's workout */}
      {todayActivity ? (
        <Card variant="default">
          <SectionHeader title="Today" />
          <button
            className="w-full text-left"
            onClick={() => setTodayExpanded(e => !e)}
          >
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-green-400 font-semibold uppercase tracking-wide mb-0.5">Completed</p>
                  <p className="text-base font-bold text-green-300 leading-tight">{todayActivity.name}</p>
                </div>
                <ChevronIcon expanded={todayExpanded} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-green-400/80">
                {todayActivity.distance > 0 && (
                  <span>{(todayActivity.distance / 1609.34).toFixed(1)} mi</span>
                )}
                {todayActivity.moving_time > 0 && (
                  <span>{formatDuration(todayActivity.moving_time)}</span>
                )}
                {todayActivity.icu_training_load > 0 && (
                  <span>{Math.round(todayActivity.icu_training_load)} TSS</span>
                )}
                {todayActivity.average_heartrate > 0 && (
                  <span>{Math.round(todayActivity.average_heartrate)} bpm</span>
                )}
              </div>
            </div>
          </button>

          {todayExpanded && (
            <div className="mt-3 pt-3 border-t border-white/5">
              {todaySegments.length > 0 && (
                <div className="mb-3">
                  <WorkoutChart segments={todaySegments} />
                </div>
              )}
              {todayEvent && (
                <>
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-1">Planned</p>
                  <p className="text-sm font-bold text-white mb-1">{todayEvent.name}</p>
                  {todayEvent.description && (
                    <p className="text-xs text-gray-500 leading-relaxed">{todayEvent.description}</p>
                  )}
                </>
              )}
            </div>
          )}
        </Card>

      ) : todayEvent ? (
        <Card variant="default">
          <SectionHeader title="Today's Workout" />
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white leading-tight">{todayEvent.name}</h3>
              {todayEvent.moving_time > 0 && (
                <p className="text-sm text-gray-400 mt-0.5">{formatDuration(todayEvent.moving_time)}</p>
              )}
            </div>
          </div>
          {todaySegments.length > 0 && (
            <div className="mb-3">
              <WorkoutChart segments={todaySegments} />
            </div>
          )}
          {todayEvent.description && (
            <p className="text-xs text-gray-500 leading-relaxed">{todayEvent.description}</p>
          )}
        </Card>

      ) : isRestDay ? (
        <Card variant="default">
          <SectionHeader title="Today" />
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">😴</div>
            <div>
              <p className="text-base font-semibold text-white">Rest Day</p>
              <p className="text-sm text-gray-400">Recovery is part of training.</p>
            </div>
          </div>
        </Card>

      ) : (
        <Card variant="default">
          <p className="text-sm text-gray-500 text-center py-4">No workout scheduled.</p>
        </Card>
      )}

      {/* Next Workout tile */}
      {nextWorkoutData && (
        <Card variant="elevated">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Next Up</span>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{nextWorkoutData.dateLabel}</span>
              </div>
              <p className="text-sm font-bold text-white leading-tight truncate">{nextWorkoutData.name}</p>
            </div>
            {nextWorkoutData.movingTime > 0 && (
              <span className="text-xs text-gray-500 shrink-0">{formatDuration(nextWorkoutData.movingTime)}</span>
            )}
          </div>
          {nextWorkoutData.segments.length > 0 && (
            <WorkoutChart segments={nextWorkoutData.segments} compact />
          )}
        </Card>
      )}

    </div>
  )
}
