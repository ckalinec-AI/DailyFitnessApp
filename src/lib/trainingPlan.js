import { differenceInCalendarDays, startOfDay, addDays, format } from 'date-fns'
import planData from '../data/trainingPlan.json'

export const PLAN_START_DATE_DEFAULT = '2026-06-04'
export const RACE_DAY_OFFSET = 58
export const PLAN_END_OFFSET = 72

export const HR_ZONES = {
  1: { name: 'Z1 Recovery',   min: 116, max: 139, color: '#9CA3AF' },
  2: { name: 'Z2 Endurance',  min: 140, max: 151, color: '#10B981' },
  3: { name: 'Z3 Tempo',      min: 152, max: 163, color: '#F59E0B' },
  4: { name: 'Z4 Threshold',  min: 164, max: 174, color: '#F97316' },
  5: { name: 'Z5 VO2 Max',    min: 175, max: 186, color: '#EF4444' },
}

// offset → workout lookup (built once at module load)
const workoutByOffset = new Map(
  planData.workouts.map(({ startDateOffset, workout }) => [startDateOffset, workout])
)

export function getDayOffset(startDate, targetDate = new Date()) {
  return differenceInCalendarDays(
    startOfDay(targetDate instanceof Date ? targetDate : new Date(targetDate)),
    startOfDay(new Date(startDate))
  )
}

export function getDateForOffset(startDate, offset) {
  return addDays(new Date(startDate), offset)
}

export function getWorkoutForOffset(offset) {
  return workoutByOffset.get(offset) ?? null
}

export function getWorkoutForDate(startDate, date = new Date()) {
  const offset = getDayOffset(startDate, date)
  if (offset < 0 || offset > PLAN_END_OFFSET) return null
  return getWorkoutForOffset(offset)
}

export function getWeekNumber(startDate, date = new Date()) {
  const offset = getDayOffset(startDate, date)
  if (offset < 0) return null
  return Math.floor(offset / 7) + 1
}

// Returns 7 day objects for the week containing `date`
export function getWeekWorkouts(startDate, date = new Date()) {
  const todayOffset = getDayOffset(startDate, date)
  const weekStart = Math.floor(Math.max(todayOffset, 0) / 7) * 7

  return Array.from({ length: 7 }, (_, i) => {
    const offset = weekStart + i
    const workout = getWorkoutForOffset(offset)
    return {
      offset,
      date: getDateForOffset(startDate, offset),
      dayLabel: format(getDateForOffset(startDate, offset), 'EEE'),
      workout,
      isRest: workout === null,
      isToday: offset === todayOffset,
      isPast: offset < todayOffset,
      isRaceDay: offset === RACE_DAY_OFFSET,
    }
  })
}

// Total workout duration in minutes (handles repeat steps correctly)
export function getWorkoutDuration(workout) {
  if (!workout) return 0

  function stepSeconds(step) {
    const repeats = parseInt(step.repeats, 10) || 1
    if (step.type === 'repeat' && step.subSteps?.length) {
      const subTotal = step.subSteps.reduce((s, sub) => s + stepSeconds(sub), 0)
      return subTotal * repeats
    }
    return (parseInt(step.duration, 10) || 0) * repeats
  }

  const total = workout.steps.reduce((sum, s) => sum + stepSeconds(s), 0)
  return Math.round(total / 60)
}

// Highest zone number used in a workout
export function getPrimaryZone(workout) {
  if (!workout) return null
  let max = 1

  function check(step) {
    const z = parseInt(step.startValue, 10)
    if (z > max) max = z
    step.subSteps?.forEach(check)
  }

  workout.steps.forEach(check)
  return max
}

// Intensity bucket for nudge banner logic
export function getWorkoutIntensity(workout) {
  if (!workout) return 'rest'
  const z = getPrimaryZone(workout)
  if (z <= 1) return 'recovery'   // pure Z1
  if (z <= 2) return 'endurance'  // Z2
  if (z <= 3) return 'tempo'      // Z3
  return 'threshold'              // Z4–Z5
}

// Human-readable structure summary: "Warmup → 3× (5min Z3 / 3min Z1) → Cooldown"
export function getStructureSummary(workout) {
  if (!workout) return null
  const parts = []

  const hasWarmup  = workout.steps.some(s => /warm/i.test(s.name))
  const hasCooldown = workout.steps.some(s => /cool/i.test(s.name))

  workout.steps.forEach(step => {
    if (/warm|cool/i.test(step.name)) return

    if (step.type === 'repeat' && step.subSteps?.length) {
      const repeats = parseInt(step.repeats, 10)
      const inner = step.subSteps
        .map(s => {
          const mins = Math.round(parseInt(s.duration, 10) / 60)
          return `${mins}min Z${s.startValue}`
        })
        .join(' / ')
      parts.push(`${repeats}× (${inner})`)
    } else if (step.type === 'heartRate') {
      const mins = Math.round(parseInt(step.duration, 10) / 60)
      parts.push(`${mins}min Z${step.startValue}`)
    }
  })

  const summary = []
  if (hasWarmup) summary.push('Warmup')
  summary.push(...parts)
  if (hasCooldown) summary.push('Cooldown')

  return summary.join(' → ')
}

// Extract planned miles from name, e.g. "Long Endurance Ride (105 min · ~22 mi)" → 22
export function getPlannedMiles(workout) {
  if (!workout) return 0
  const m = workout.name.match(/~(\d+)\s*mi/)
  return m ? parseInt(m[1], 10) : 0
}

// Sum planned miles across a week
export function getWeekPlannedMiles(startDate, date = new Date()) {
  return getWeekWorkouts(startDate, date)
    .reduce((sum, { workout }) => sum + getPlannedMiles(workout), 0)
}

// Days until race from a given date
export function getDaysToRace(startDate, date = new Date()) {
  const offset = getDayOffset(startDate, date)
  return Math.max(0, RACE_DAY_OFFSET - offset)
}

// Nudge banner logic: compare recovery score to workout intensity
// Returns { show, type, message } or null
export function getNudge(recoveryScore, workout) {
  if (recoveryScore == null || !workout) return null

  const intensity = getWorkoutIntensity(workout)

  // Low recovery + hard workout
  if (recoveryScore <= 33 && (intensity === 'threshold' || intensity === 'tempo')) {
    return {
      type: 'warning',
      message: "Your body's working hard overnight. Zone 2 today would still build fitness — don't dig a deeper hole.",
    }
  }

  // Low recovery + endurance (borderline ok, gentle nudge)
  if (recoveryScore <= 33 && intensity === 'endurance') {
    return {
      type: 'warning',
      message: "Recovery is low. Keep today genuinely easy — stay in the bottom of Z2.",
    }
  }

  // High recovery + rest day
  if (recoveryScore >= 67 && intensity === 'recovery') {
    return {
      type: 'positive',
      message: "Strong recovery today. Your plan calls for an easy spin — stick to it. Adaptation happens on rest days.",
    }
  }

  // High recovery + hard session = green light
  if (recoveryScore >= 67 && (intensity === 'threshold' || intensity === 'tempo')) {
    return {
      type: 'positive',
      message: "You're primed. Strong recovery + a hard session — execute cleanly.",
    }
  }

  // Mid recovery + mid intensity = no nudge (aligned)
  return null
}
