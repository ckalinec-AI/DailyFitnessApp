export const RECOVERY_THRESHOLDS = {
  GREEN: 67,
  YELLOW: 34,
}

export const INTENSITY_LEVELS = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  VERY_HIGH: 'very_high',
}

export const WORKOUT_INTENSITY_MAP = {
  'Recovery Ride': INTENSITY_LEVELS.LOW,
  'Endurance': INTENSITY_LEVELS.MODERATE,
  'Tempo': INTENSITY_LEVELS.HIGH,
  'Threshold': INTENSITY_LEVELS.HIGH,
  'Race Simulation': INTENSITY_LEVELS.VERY_HIGH,
}

export const APP_NAME = 'Kadence'
export const STORAGE_PREFIX = 'kadence_'
