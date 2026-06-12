import { STORAGE_PREFIX } from './constants'

export function getItem(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    return raw !== null ? JSON.parse(raw) : defaultValue
  } catch {
    return defaultValue
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // localStorage unavailable (private browsing, quota exceeded)
  }
}

export function removeItem(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    // ignore
  }
}

export function clearAll() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX))
    keys.forEach(k => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}
