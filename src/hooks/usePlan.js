import { useMemo } from 'react'
import { getItem } from '../lib/storage'
import {
  PLAN_START_DATE_DEFAULT,
  RACE_DAY_OFFSET,
  getDayOffset,
  getWorkoutForDate,
  getWeekNumber,
  getWeekWorkouts,
  getWorkoutDuration,
  getPrimaryZone,
  getWorkoutIntensity,
  getStructureSummary,
  getWeekPlannedMiles,
  getDaysToRace,
} from '../lib/trainingPlan'

export function usePlan() {
  const startDate = getItem('planStartDate', PLAN_START_DATE_DEFAULT)
  const today = new Date()

  const dayOffset       = useMemo(() => getDayOffset(startDate, today), [startDate])
  const weekNumber      = useMemo(() => getWeekNumber(startDate, today), [startDate])
  const todayWorkout    = useMemo(() => getWorkoutForDate(startDate, today), [startDate])
  const weekWorkouts    = useMemo(() => getWeekWorkouts(startDate, today), [startDate])
  const weekPlannedMiles = useMemo(() => getWeekPlannedMiles(startDate, today), [startDate])
  const daysToRace      = useMemo(() => getDaysToRace(startDate, today), [startDate])

  const todayDetails = useMemo(() => {
    if (!todayWorkout) return null
    return {
      workout:     todayWorkout,
      duration:    getWorkoutDuration(todayWorkout),
      primaryZone: getPrimaryZone(todayWorkout),
      intensity:   getWorkoutIntensity(todayWorkout),
      structure:   getStructureSummary(todayWorkout),
    }
  }, [todayWorkout])

  return {
    startDate,
    dayOffset,
    weekNumber,
    todayWorkout,
    todayDetails,
    weekWorkouts,
    weekPlannedMiles,
    daysToRace,
    isRestDay:   todayWorkout === null && dayOffset >= 0,
    isPlanActive: dayOffset >= 0 && dayOffset <= 72,
    isRaceDay:   dayOffset === RACE_DAY_OFFSET,
  }
}
