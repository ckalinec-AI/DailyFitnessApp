const NAMESPACE = 'kadence_'

export function getItem(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(NAMESPACE + key)
    if (raw === null) return defaultValue
    return JSON.parse(raw)
  } catch {
    return defaultValue
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(NAMESPACE + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeItem(key) {
  try {
    localStorage.removeItem(NAMESPACE + key)
  } catch {
    // Ignore errors on remove
  }
}

export function clearAll() {
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(NAMESPACE)) {
        keysToRemove.push(k)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
  } catch {
    // Ignore errors
  }
}

export function getAll() {
  const result = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(NAMESPACE)) {
        const shortKey = k.slice(NAMESPACE.length)
        result[shortKey] = getItem(shortKey)
      }
    }
  } catch {
    // Return partial result
  }
  return result
}
