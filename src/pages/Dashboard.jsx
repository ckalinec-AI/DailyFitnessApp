import { useState } from 'react'
import { format } from 'date-fns'
import { usePlan } from '../hooks/usePlan'
import { HR_ZONES } from '../lib/trainingPlan'
import {
  Card,
  Badge,
  StatDisplay,
  SectionHeader,
  ProgressBar,
  RecoveryRing,
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

  // Mock Whoop data — replaced by live API in a later step
  const recovery = { score: 74, hrv: 45, rhr: 58, sleepPct: 87, synced: 12 }
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  const nudge = (() => {
    if (!plan.todayDetails || nudgeDismissed) return null
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
        <SectionHeader title="Recovery" />
        <div className="flex items-center gap-5">
          <RecoveryRing score={recovery.score} size="lg" />
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-3">
            <StatDisplay value={recovery.hrv}      unit="ms"  label="HRV"        size="md" />
            <StatDisplay value={recovery.rhr}      unit="bpm" label="Resting HR"  size="md" />
            <StatDisplay value={recovery.sleepPct} unit="%"   label="Sleep"       size="md" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
              <Badge variant="recovery" size="sm">Optimal</Badge>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3">Last synced {recovery.synced} min ago · Connect Whoop</p>
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

      {/* Weight placeholder */}
      <Card variant="default">
        <SectionHeader title="Weight" action={{ label: 'Log', onClick: () => {} }} />
        <p className="text-sm text-gray-500 py-2">No entries yet — tap Log to add today's weight.</p>
      </Card>

    </div>
  )
}
