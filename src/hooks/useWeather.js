import { useState, useEffect, useCallback, useMemo } from 'react'
import { getItem, setItem } from '../lib/storage'

const CACHE_KEY = 'kadence_weather_cache_v5'
const LOCATION_KEY = 'kadence_weather_location'
const CACHE_TTL_MS = 30 * 60 * 1000
const LOCATION_TTL_MS = 12 * 60 * 60 * 1000
const BUFFER_MINS = 60

const PW_ICONS = {
  'clear-day':           { label: 'Clear',         icon: '☀️' },
  'clear-night':         { label: 'Clear',         icon: '🌙' },
  'rain':                { label: 'Rain',           icon: '🌧' },
  'snow':                { label: 'Snow',           icon: '❄️' },
  'sleet':               { label: 'Sleet',         icon: '🌨' },
  'wind':                { label: 'Windy',          icon: '💨' },
  'fog':                 { label: 'Fog',            icon: '🌫' },
  'cloudy':              { label: 'Overcast',       icon: '☁️' },
  'partly-cloudy-day':   { label: 'Partly Cloudy', icon: '⛅' },
  'partly-cloudy-night': { label: 'Partly Cloudy', icon: '🌤' },
  'thunderstorm':        { label: 'Thunderstorm',  icon: '⛈' },
  'tornado':             { label: 'Tornado',        icon: '🌪' },
}

function getPwIcon(iconStr) {
  return PW_ICONS[iconStr] ?? { label: iconStr ?? 'Unknown', icon: '🌡' }
}

function degreesToCompass(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

function cloudLabel(pct) {
  if (pct < 20) return 'Clear'
  if (pct < 60) return 'Partly Cloudy'
  if (pct < 85) return 'Mostly Cloudy'
  return 'Overcast'
}

function fmtTime(date) {
  const h = date.getHours() % 12 || 12
  const m = date.getMinutes()
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM'
  return m === 0 ? `${h} ${ampm}` : `${h}:${m.toString().padStart(2, '0')} ${ampm}`
}

function calcRideWindow(raw, rideDurationMins) {
  const now = new Date()
  const nowMs = now.getTime()
  const windowMins = rideDurationMins + BUFFER_MINS
  const endDate = new Date(nowMs + windowMins * 60 * 1000)
  const windowEndMs = endDate.getTime()

  const hourly = raw.hourlyData ?? []
  const windowHours = hourly.filter(h => h.time * 1000 >= nowMs && h.time * 1000 <= windowEndMs)

  const rawMaxPct = windowHours.length ? Math.max(...windowHours.map(h => h.precipProbability * 100)) : 0
  const precipPct = rawMaxPct < 10 ? 0 : Math.round(rawMaxPct / 5) * 5

  const totalIn = windowHours.reduce((s, h) => s + (h.precipIntensity ?? 0), 0)
  const precipIn = totalIn < 0.01 ? 0 : parseFloat(totalIn.toFixed(2))

  const windowLabel = `${fmtTime(now)} – ${fmtTime(endDate)}`

  const endEntry = hourly.find(h => h.time * 1000 >= nowMs + rideDurationMins * 60 * 1000)
  const tempEnd = endEntry ? Math.round(endEntry.temperature) : null

  return { precipPct, precipIn, windowLabel, windowMins, tempEnd }
}

export function useWeather({ rideDurationMins = 60 } = {}) {
  const [raw, setRaw] = useState(() => getItem(CACHE_KEY, null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const weather = useMemo(() => {
    if (!raw) return null
    const window = calcRideWindow(raw, rideDurationMins)
    return {
      tempF:           raw.tempF,
      condition:       raw.condition,
      icon:            raw.icon,
      cloudPct:        raw.cloudPct,
      cloudLabel:      raw.cloudLabel,
      windMph:         raw.windMph,
      windDir:         raw.windDir,
      stormDistanceMi: raw.stormDistanceMi,
      stormBearing:    raw.stormBearing,
      ...window,
      fetchedAt:       raw.fetchedAt,
    }
  }, [raw, rideDurationMins])

  const fetchWeather = useCallback(async ({ forceRefresh = false } = {}) => {
    const cached = getItem(CACHE_KEY, null)
    if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setRaw(cached)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let lat, lon
      const cachedLoc = getItem(LOCATION_KEY, null)
      const locFresh = cachedLoc && (Date.now() - (cachedLoc.fetchedAt ?? 0)) < LOCATION_TTL_MS
      if (locFresh) {
        lat = cachedLoc.lat
        lon = cachedLoc.lon
      } else {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true })
        )
        lat = pos.coords.latitude
        lon = pos.coords.longitude
        setItem(LOCATION_KEY, { lat, lon, fetchedAt: Date.now() })
      }

      const res = await fetch('/.netlify/functions/pirate-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon }),
      })
      if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`)
      const json = await res.json()

      const cur = json.currently
      const pw = getPwIcon(cur.icon)

      const rawData = {
        tempF:           Math.round(cur.temperature),
        condition:       pw.label,
        icon:            pw.icon,
        cloudPct:        Math.round((cur.cloudCover ?? 0) * 100),
        cloudLabel:      cloudLabel(Math.round((cur.cloudCover ?? 0) * 100)),
        windMph:         Math.round(cur.windSpeed ?? 0),
        windDir:         degreesToCompass(cur.windBearing ?? 0),
        stormDistanceMi: cur.nearestStormDistance ?? null,
        stormBearing:    cur.nearestStormBearing ?? null,
        hourlyData:      json.hourly?.data ?? [],
        fetchedAt:       Date.now(),
        lat,
        lon,
      }

      setItem(CACHE_KEY, rawData)
      setRaw(rawData)
    } catch (err) {
      if (err.code === 1) {
        setError('Location access denied — enable in browser settings.')
      } else {
        setError(err.message || 'Could not fetch weather.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWeather()
  }, [fetchWeather])

  return { weather, loading, error, refresh: fetchWeather }
}
