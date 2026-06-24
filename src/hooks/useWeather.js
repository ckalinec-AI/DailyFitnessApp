import { useState, useEffect, useCallback } from 'react'
import { getItem, setItem } from '../lib/storage'

const CACHE_KEY = 'kadence_weather_cache'
const LOCATION_KEY = 'kadence_weather_location'
const CACHE_TTL_MS = 30 * 60 * 1000
const LOCATION_TTL_MS = 12 * 60 * 60 * 1000

const WMO = {
  0:  { label: 'Clear sky',          icon: '☀️' },
  1:  { label: 'Mainly clear',       icon: '🌤' },
  2:  { label: 'Partly cloudy',      icon: '⛅' },
  3:  { label: 'Overcast',           icon: '☁️' },
  45: { label: 'Fog',                icon: '🌫' },
  48: { label: 'Icy fog',            icon: '🌫' },
  51: { label: 'Light drizzle',      icon: '🌦' },
  53: { label: 'Drizzle',            icon: '🌦' },
  55: { label: 'Heavy drizzle',      icon: '🌧' },
  61: { label: 'Light rain',         icon: '🌧' },
  63: { label: 'Rain',               icon: '🌧' },
  65: { label: 'Heavy rain',         icon: '🌧' },
  71: { label: 'Light snow',         icon: '🌨' },
  73: { label: 'Snow',               icon: '❄️' },
  75: { label: 'Heavy snow',         icon: '❄️' },
  77: { label: 'Snow grains',        icon: '🌨' },
  80: { label: 'Light showers',      icon: '🌦' },
  81: { label: 'Showers',            icon: '🌧' },
  82: { label: 'Heavy showers',      icon: '⛈' },
  85: { label: 'Snow showers',       icon: '🌨' },
  86: { label: 'Heavy snow showers', icon: '🌨' },
  95: { label: 'Thunderstorm',       icon: '⛈' },
  96: { label: 'Thunderstorm + hail',icon: '⛈' },
  99: { label: 'Heavy hail storm',   icon: '⛈' },
}

function getWmo(code) {
  return WMO[code] ?? { label: 'Unknown', icon: '🌡' }
}

function degreesToCompass(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

export function useWeather() {
  const [weather, setWeather] = useState(() => getItem(CACHE_KEY, null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchWeather = useCallback(async ({ forceRefresh = false } = {}) => {
    const cached = getItem(CACHE_KEY, null)
    if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setWeather(cached)
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

      const url = new URL('https://api.open-meteo.com/v1/forecast')
      url.searchParams.set('latitude', lat)
      url.searchParams.set('longitude', lon)
      url.searchParams.set('current', [
        'temperature_2m',
        'weather_code',
        'wind_speed_10m',
        'wind_direction_10m',
        'cloud_cover',
      ].join(','))
      url.searchParams.set('hourly', [
        'precipitation_probability',
        'precipitation',
      ].join(','))
      url.searchParams.set('temperature_unit', 'fahrenheit')
      url.searchParams.set('wind_speed_unit', 'mph')
      url.searchParams.set('precipitation_unit', 'inch')
      url.searchParams.set('forecast_days', '1')
      url.searchParams.set('timezone', 'auto')

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`)
      const json = await res.json()

      const cur = json.current
      const wmo = getWmo(cur.weather_code)
      const nowHour = new Date().getHours()

      // Precip probability: max over next 6h, suppress model noise < 10%
      const precipProbHourly = json.hourly?.precipitation_probability ?? []
      const next6Prob = precipProbHourly.slice(nowHour, nowHour + 6)
      const rawMaxPct = next6Prob.length ? Math.max(...next6Prob) : 0
      const precipPct = rawMaxPct < 10 ? 0 : Math.round(rawMaxPct / 5) * 5

      // Total expected precip over next 6h in inches
      const precipAmtHourly = json.hourly?.precipitation ?? []
      const next6Amt = precipAmtHourly.slice(nowHour, nowHour + 6)
      const totalPrecipIn = next6Amt.reduce((s, v) => s + (v ?? 0), 0)
      const precipIn = totalPrecipIn < 0.01 ? 0 : parseFloat(totalPrecipIn.toFixed(2))

      const data = {
        tempF: Math.round(cur.temperature_2m),
        condition: wmo.label,
        icon: wmo.icon,
        cloudPct: Math.round(cur.cloud_cover ?? 0),
        windMph: Math.round(cur.wind_speed_10m),
        windDir: degreesToCompass(cur.wind_direction_10m ?? 0),
        precipPct,
        precipIn,
        fetchedAt: Date.now(),
        lat,
        lon,
      }

      setItem(CACHE_KEY, data)
      setWeather(data)
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
