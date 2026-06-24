import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import { usePlan } from '../hooks/usePlan'
import { useWhoop } from '../hooks/useWhoop'
import { HR_ZONES, PLAN_START_DATE_DEFAULT } from '../lib/trainingPlan'
import { logWeight, getRecentEntries, getWeightChange } from '../lib/weight'
import {
  Card,
  Badge,
  StatDisplay,
  SectionHeader,
  ProgressBar,
  MetricRing,
  NudgeBanner,
} from '../components/ui'

const zoneBadgeVariant = { 1: 'muted', 2: 'recovery', 3: 'warning', 4: 'accent', 5: 'danger' }

const intensityLabel = {
  rest:       { text: 'Rest',       variant: 'muted' },
  recovery:   { text: 'Recovery',   variant: 'muted' },
  endurance:  { text: 'Endurance',  variant: 'recovery' },
  tempo:      { text: 'Tempo',      variant: 'warning' },
  threshold:  { text: 'Threshold',  variant: 'accent' },
}

export default function Dashboard() {
  const plan = usePlan()

  const whoop = useWhoop()
  const recovery = {
    score:    whoop.recoveryData?.score    ?? null,
    hrv:      whoop.recoveryData?.hrv      ?? null,
    rhr:      whoop.recoveryData?.rhr      ?? null,
    sleepPct: whoop.sleepData?.sleepPct    ?? null,
    strain:   whoop.strainData?.strain     ?? null,
    synced:   whoop.lastSyncedMins         ?? null,
  }
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  // Weight tracking state
  const [inputWeight, setInputWeight] = useState('')
  const [entries, setEntries] = useState([])
  const [weightChange, setWeightChange] = useState(null)

  useEffect(() => {
    const recent = getRecentEntries(7)
    setEntries(recent)
    setWeightChange(getWeightChange(PLAN_START_DATE_DEFAULT))
  }, [])

  function handleLog() {
    const val = parseFloat(inputWeight)
    if (!val || isNaN(val)) return
    logWeight(val)
    const recent = getRecentEntries(7)
    setEntries(recent)
    setWeightChange(getWeightChange(PLAN_START_DATE_DEFAULT))
    setInputWeight('')
  }

  const nudge = (() => {
    if (!plan.todayDetails || nudgeDismissed || recovery.score == null) return null
    const { intensity } = plan.todayDetails
    if (recovery.score <= 33 && (intensity === 'threshold' || intensity === 'tempo')) {
      return { type: 'warning', message: "Your body's working hard overnight. Zone 2 today would still build fitness." }
    }
    if (recovery.score >= 67 && intensity === 'threshold') {
      return { type: 'positive', message: "You're primed — strong recovery + a hard session. Execute cleanly." }
    }
    return null
  })()

  const { todayDetails, weekNumber, weekWorkouts, weekPlannedMiles, daysToRace, isRestDay } = plan

  return (
    <div className="px-4 pt-6 pb-8 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Kadence</h1>
          <p className="text-xs text-gray-400 mt-0.5">{format(new Date(), 'EEEE, MMM d')}</p>
        </div>
        {weekNumber && (
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Week</p>
            <p className="text-xl font-black text-blue-400">{weekNumber}</p>
          </div>
        )}
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

      {/* Nudge banner */}
      {nudge && (
        <NudgeBanner
          type={nudge.type}
          message={nudge.message}
          onDismiss={() => setNudgeDismissed(true)}
        />
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
        <p className="text-xs text-center mt-1">
          {whoop.connected
            ? whoop.error
              ? <span className="text-yellow-600/80">{whoop.error}</span>
              : recovery.synced !== null
                ? <span className="text-gray-600">Last synced {recovery.synced} min ago</span>
                : <span className="text-gray-600">Syncing...</span>
            : <button onClick={whoop.connect} className="text-blue-500 hover:text-blue-400 transition-colors">Connect Whoop →</button>
          }
        </p>
      </Card>

      {/* Today's workout */}
      {isRestDay ? (
        <Card variant="default">
          <SectionHeader title="Today" />
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">😴</div>
            <div>
              <p className="text-base font-semibold text-white">Rest Day</p>
              <p className="text-sm text-gray-400">Sunday recovery — you've earned it.</p>
            </div>
          </div>
        </Card>
      ) : todayDetails ? (
        <Card variant="default">
          <SectionHeader title="Today's Workout" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white leading-tight">{todayDetails.workout.name}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-sm text-gray-400">{todayDetails.duration} min</span>
                {todayDetails.primaryZone && (
                  <>
                    <span className="text-gray-700">·</span>
                    <Badge variant={zoneBadgeVariant[todayDetails.primaryZone] ?? 'accent'} size="sm">
                      {HR_ZONES[todayDetails.primaryZone]?.name}
                    </Badge>
                  </>
                )}
              </div>
              {todayDetails.structure && (
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{todayDetails.structure}</p>
              )}
            </div>
            {intensityLabel[todayDetails.intensity] && (
              <Badge variant={intensityLabel[todayDetails.intensity].variant} size="sm" className="shrink-0">
                {intensityLabel[todayDetails.intensity].text}
              </Badge>
            )}
          </div>
          {todayDetails.workout.description && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                {todayDetails.workout.description}
              </p>
            </div>
          )}
        </Card>
      ) : (
        <Card variant="default">
          <p className="text-sm text-gray-500 text-center py-4">
            {plan.dayOffset < 0 ? 'Plan starts June 4, 2026' : 'Plan complete — great work.'}
          </p>
        </Card>
      )}

      {/* Week strip */}
      <Card variant="elevated" padding="sm">
        <SectionHeader title="This Week" />
        <div className="grid grid-cols-7 gap-1">
          {weekWorkouts.map(({ offset, dayLabel, workout, isRest, isToday, isPast, isRaceDay: rd }) => (
            <div
              key={offset}
              className={[
                'flex flex-col items-center gap-1 py-2 rounded-xl',
                isToday ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : '',
              ].join(' ')}
            >
              <span className={`text-xs font-medium ${isToday ? 'text-blue-400' : 'text-gray-500'}`}>
                {dayLabel}
              </span>
              <div className={[
                'w-2 h-2 rounded-full',
                rd      ? 'bg-yellow-400'  :
                isRest  ? 'bg-white/10'    :
                isPast  ? 'bg-blue-700'    :
                isToday ? 'bg-blue-400'    :
                          'bg-white/20',
              ].join(' ')} />
              {!isRest && !rd && (
                <span className="text-[9px] text-gray-600 leading-none">
                  {workout ? Math.round(workout.steps.reduce((s, st) => s + (parseInt(st.duration,10)||0), 0) / 60) : ''}m
                </span>
              )}
            </div>
          ))}
        </div>
        {weekPlannedMiles > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <ProgressBar label="Planned miles this week" value={0} max={weekPlannedMiles} unit="mi" />
          </div>
        )}
      </Card>

      {/* Weight tracking */}
      <Card variant="default">
        <SectionHeader title="Weight" />
        {/* Input row */}
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            step="0.1"
            value={inputWeight}
            onChange={e => setInputWeight(e.target.value)}
            placeholder="185"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
          />
          <button
            onClick={handleLog}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Log
          </button>
        </div>
        {/* Sparkline (only if entries exist) */}
        {entries.length > 1 && (
          <div className="-mx-1">
            <ResponsiveContainer width="100%" height={52}>
              <AreaChart data={entries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                <Area type="monotone" dataKey="weight" stroke="#3B82F6" strokeWidth={2} fill="url(#wGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* Stat line */}
        {weightChange && (
          <p className="text-xs text-gray-400 mt-2">
            {weightChange.change < 0 ? '↓' : '↑'} {Math.abs(weightChange.change).toFixed(1)} lbs since Jun 4
          </p>
        )}
        {entries.length === 0 && (
          <p className="text-sm text-gray-600 text-center py-2">Log your weight to start tracking</p>
        )}
      </Card>

    </div>
  )
}
