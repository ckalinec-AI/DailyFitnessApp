import { getItem, setItem } from './storage'

const KEY = 'weight_log'

export function getWeightLog() {
  return getItem(KEY, [])
}

// Upserts today's entry. date is today in YYYY-MM-DD.
export function logWeight(weightLbs) {
  return logWeightForDate(new Date().toISOString().split('T')[0], weightLbs)
}

export function logWeightForDate(date, weightLbs) {
  const log = getWeightLog().filter(Boolean)
  const idx = log.findIndex(e => e.date === date)
  if (idx >= 0) {
    log[idx] = { date, weight: Number(weightLbs) }
  } else {
    log.push({ date, weight: Number(weightLbs) })
    log.sort((a, b) => a.date.localeCompare(b.date))
  }
  setItem(KEY, log)
  return log
}

export function getRecentEntries(n = 7) {
  return getWeightLog().slice(-n)
}

// Returns { change, fromDate, fromWeight, currentWeight } or null if <2 entries
export function getWeightChange(fromDate) {
  const log = getWeightLog()
  if (log.length < 2) return null
  const first = log.find(e => e.date >= fromDate) || log[0]
  const last = log[log.length - 1]
  if (first === last) return null
  return {
    change: last.weight - first.weight,
    fromDate: first.date,
    fromWeight: first.weight,
    currentWeight: last.weight,
  }
}

export function getTodayEntry() {
  const date = new Date().toISOString().split('T')[0]
  return getWeightLog().find(e => e.date === date) || null
}
