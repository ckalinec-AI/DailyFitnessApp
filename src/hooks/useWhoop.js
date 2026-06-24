import { useState, useEffect, useCallback, useRef } from 'react'
import { getItem, setItem, removeItem } from '../lib/storage'
import {
  buildAuthUrl, exchangeCode, refreshAccessToken,
  fetchRecovery, fetchSleep, fetchCycle,
} from '../lib/whoop'

export function useWhoop() {
  const [connected, setConnected] = useState(() => !!getItem('whoop_access_token', null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [recoveryData, setRecoveryData] = useState(null)
  const [sleepData, setSleepData] = useState(null)
  const [strainData, setStrainData] = useState(null)
  const refreshingRef = useRef(false)

  // Get a valid access token (refreshes if expired)
  const getValidToken = useCallback(async () => {
    const token = getItem('whoop_access_token', null)
    const expiry = getItem('whoop_token_expiry', 0)
    const refreshToken = getItem('whoop_refresh_token', null)

    if (token && Date.now() < expiry - 60000) return token // valid for 60+ more seconds

    if (!refreshToken) return null

    if (refreshingRef.current) return null
    refreshingRef.current = true
    try {
      const data = await refreshAccessToken(refreshToken)
      storeTokens(data)
      return data.access_token
    } catch {
      disconnect()
      return null
    } finally {
      refreshingRef.current = false
    }
  }, [])

  function storeTokens({ access_token, refresh_token, expires_in }) {
    setItem('whoop_access_token', access_token)
    if (refresh_token) setItem('whoop_refresh_token', refresh_token)
    setItem('whoop_token_expiry', Date.now() + (expires_in || 3600) * 1000)
    setConnected(true)
  }

  const disconnect = useCallback(() => {
    removeItem('whoop_access_token')
    removeItem('whoop_refresh_token')
    removeItem('whoop_token_expiry')
    removeItem('whoop_recovery_cache')
    removeItem('whoop_sleep_cache')
    removeItem('whoop_strain_cache')
    setConnected(false)
    setRecoveryData(null)
    setSleepData(null)
    setStrainData(null)
  }, [])

  const connect = useCallback(async () => {
    const url = await buildAuthUrl()
    window.location.href = url
  }, [])

  const syncData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getValidToken()
      if (!token) { setLoading(false); return }

      const [recResult, sleepResult, cycleResult] = await Promise.allSettled([
        fetchRecovery(token),
        fetchSleep(token),
        fetchCycle(token),
      ])

      const rec   = recResult.status   === 'fulfilled' ? recResult.value   : null
      const sleep = sleepResult.status === 'fulfilled' ? sleepResult.value : null
      const cycle = cycleResult.status === 'fulfilled' ? cycleResult.value : null

      if (!rec && !sleep && !cycle) {
        const firstErr = [recResult, sleepResult, cycleResult]
          .find(r => r.status === 'rejected')?.reason
        const status = firstErr?.status
        if (status === 401) {
          setError('Session expired — reconnect Whoop.')
          disconnect()
        } else if (status === 403) {
          setError('Permission denied (403) — reconnect Whoop to re-grant access.')
        } else {
          setError(firstErr?.message || 'Could not reach Whoop API.')
        }
      }

      if (rec) {
        const parsed = {
          score: rec.score?.recovery_score ?? null,
          hrv: rec.score?.hrv_rmssd_milli ? Math.round(rec.score.hrv_rmssd_milli) : null,
          rhr: rec.score?.resting_heart_rate ?? null,
          updatedAt: rec.updated_at,
        }
        setRecoveryData(parsed)
        setItem('whoop_recovery_cache', parsed)
      }

      if (sleep) {
        const parsed = {
          sleepPct: sleep.score?.sleep_performance_percentage ?? null,
          updatedAt: sleep.updated_at,
        }
        setSleepData(parsed)
        setItem('whoop_sleep_cache', parsed)
      }

      if (cycle) {
        const parsed = {
          strain: cycle.score?.strain ?? null,
          updatedAt: cycle.updated_at,
        }
        setStrainData(parsed)
        setItem('whoop_strain_cache', parsed)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [getValidToken])

  // On mount, load cached data and trigger sync if connected
  useEffect(() => {
    const cachedRec = getItem('whoop_recovery_cache', null)
    const cachedSleep = getItem('whoop_sleep_cache', null)
    const cachedStrain = getItem('whoop_strain_cache', null)
    if (cachedRec) setRecoveryData(cachedRec)
    if (cachedSleep) setSleepData(cachedSleep)
    if (cachedStrain) setStrainData(cachedStrain)

    if (connected) syncData()
  }, [connected])

  // Compute synced time
  const lastSyncedMins = recoveryData?.updatedAt
    ? Math.round((Date.now() - new Date(recoveryData.updatedAt).getTime()) / 60000)
    : null

  return {
    connected,
    loading,
    error,
    recoveryData,
    sleepData,
    strainData,
    lastSyncedMins,
    connect,
    disconnect,
    syncData,
    storeTokens,
  }
}
