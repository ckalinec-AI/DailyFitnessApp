import { useState, useEffect, useCallback } from 'react'
import { getItem, setItem } from '../lib/storage'

const CACHE_KEY = 'kadence_weather_cache'
const LOCATION_KEY = 'kadence_weather_location'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

// WMO weather code → { label, icon, clear }
const WMO = {
  0:  { label: 'Clear sky',        icon: '☀️',  clear: true },
  1:  { label: 'Mainly clear',     icon: '🌤',  clear: true },
  2:  { label: 'Partly cloudy',    icon: '⛅',  clear: false },
  3:  { label: 'Overcast',         icon: '☁️',  clear: false },
  45: { label: 'Fog',              icon: '🌫',  clear: false },
  48: { label: 'Icy fog',          icon: '🌫',  clear: false },
  51: { label: 'Light drizzle',    icon: '🌦',  clear: false },
  53: { label: 'Drizzle',          icon: '🌦',  clear: false },
  55: { label: 'Heavy drizzle',    icon: '🌧',  clear: false },
  61: { label: 'Light rain',       icon: '🌧',  clear: false },
  63: { label: 'Rain',             icon: '🌧',  clear: false },
  65: { label: 'Heavy rain',       icon: '🌧',  clear: false },
  71: { label: 'Light snow',       icon: '🌨',  clear: false },
  73: { label: 'Snow',             icon: '❄️',  clear: false },
  75: { label: 'Heavy snow',       icon: '❄️',  clear: false },
  77: { label: 'Snow grains',      icon: '🌨',  clear: false },
  80: { label: 'Light showers',    icon: '🌦',  clear: false },
  81: { label: 'Showers',          icon: '🌧',  clear: false },
  82: { label: 'Heavy showers',    icon: '⛈',  clear: false },
  85: { label: 'Snow showers',     icon: '🌨',  clear: false },
  86: { label: 'Heavy snow showers',icon: '🌨', clear: false },
  95: { label: 'Thunderstorm',     icon: '⛈',  clear: false },
  96: { label: 'Thunderstorm + hail',icon: '⛈', clear: false },
  99: { label: 'Heavy hail storm', icon: '⛈',  clear: false },
}

function getWmo(code) {
  return WMO[code] ?? { label: 'Unknown', icon: '🌡', clear: false }
}

function rainRisk(precipPct) {
  if (precipPct >= 50) return 'high'
  if (precipPct >= 25) return 'moderate'
  return 'low'
}

export function useWeather() {
  const [weather, setWeather] = useState(() => getItem(CACHE_KEY, null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchWeather = useCallback(async ({ forceRefresh = false } = {}) => {
    // Return cache if fresh
    const cached = getItem(CACHE_KEY, null)
    if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setWeather(cached)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get location (use cached coords if available)
      let lat, lon
      const cachedLoc = getItem(LOCATION_KEY, null)
      if (cachedLoc) {
        lat = cachedLoc.lat
        lon = cachedLoc.lon
      } else {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        )
        lat = pos.coords.latitude
        lon = pos.coords.longitude
        setItem(LOCATION_KEY, { lat, lon })
      }

      const url = new URL('https://api.open-meteo.com/v1/forecast')
      url.searchParams.set('latitude', lat)
      url.searchParams.set('longitude', lon)
      url.searchParams.set('current', [
        'temperature_2m',
        'weather_code',
        'wind_speed_10m',
        'precipitation_probability',
      ].join(','))
      url.searchParams.set('hourly', 'precipitation_probability')
      url.searchParams.set('temperature_unit', 'fahrenheit')
      url.searchParams.set('wind_speed_unit', 'mph')
      url.searchParams.set('forecast_days', '1')
      url.searchParams.set('timezone', 'auto')

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`)
      const json = await res.json()

      const cur = json.current
      const wmo = getWmo(cur.weather_code)

      // Max precip probability over next 6 hours
      const hourly = json.hourly?.precipitation_probability ?? []
      const nowHour = new Date().getHours()
      const next6 = hourly.slice(nowHour, nowHour + 6)
      const maxPrecipPct = next6.length ? Math.max(...next6) : (cur.precipitation_probability ?? 0)

      const data = {
        tempF: Math.round(cur.temperature_2m),
        weatherCode: cur.weather_code,
        condition: wmo.label,
        icon: wmo.icon,
        isClear: wmo.clear,
        windMph: Math.round(cur.wind_speed_10m),
        precipPct: maxPrecipPct,
        rainRisk: rainRisk(maxPrecipPct),
        // Cycling tips
        sunglasses: wmo.clear ? 'tinted' : 'clear',
        jacket: maxPrecipPct >= 25 || cur.temperature_2m < 55,
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
