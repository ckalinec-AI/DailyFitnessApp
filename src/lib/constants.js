export const APP_NAME = 'Kadence'
export const APP_VERSION = '0.1.0'

export const RECOVERY_THRESHOLDS = {
  green: 67,
  yellow: 34,
}

export const INTENSITY_LEVELS = [
  { id: 'rest', label: 'Rest', color: '#9CA3AF', description: 'Full rest or light stretching' },
  { id: 'easy', label: 'Easy', color: '#10B981', description: 'Zone 1-2 easy aerobic' },
  { id: 'moderate', label: 'Moderate', color: '#3B82F6', description: 'Zone 3 moderate effort' },
  { id: 'hard', label: 'Hard', color: '#F59E0B', description: 'Zone 4 threshold' },
  { id: 'max', label: 'Max Effort', color: '#EF4444', description: 'Zone 5 VO2 max / racing' },
]

export const HR_ZONES = [
  { zone: 1, name: 'Recovery', min: 50, max: 60, color: '#9CA3AF' },
  { zone: 2, name: 'Aerobic Base', min: 60, max: 70, color: '#10B981' },
  { zone: 3, name: 'Aerobic', min: 70, max: 80, color: '#3B82F6' },
  { zone: 4, name: 'Threshold', min: 80, max: 90, color: '#F59E0B' },
  { zone: 5, name: 'VO2 Max', min: 90, max: 100, color: '#EF4444' },
]

export const COLORS = {
  bg: '#111827',
  surface: '#1F2937',
  elevated: '#374151',
  accent: '#3B82F6',
  accentGlow: '#60A5FA',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
}

export const STORAGE_KEYS = {
  whoopAccessToken: 'whoop_access_token',
  whoopRefreshToken: 'whoop_refresh_token',
  whoopTokenExpiry: 'whoop_token_expiry',
  userSettings: 'user_settings',
  trainingPlan: 'training_plan',
  cachedRecovery: 'cached_recovery',
  cachedWorkouts: 'cached_workouts',
}

export const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth'
export const WHOOP_SCOPES = [
  'offline',
  'read:recovery',
  'read:cycles',
  'read:workout',
  'read:sleep',
  'read:profile',
  'read:body_measurement',
]

export const CHART_ANIMATION_DURATION = 300
export const DEFAULT_LOOKBACK_DAYS = 7
export const MAX_LOOKBACK_DAYS = 90
