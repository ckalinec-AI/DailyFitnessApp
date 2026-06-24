import { useState, useEffect, useCallback, useMemo } from 'react'
import { getItem, setItem } from '../lib/storage'
import { fetchEvents, fetchActivities } from '../lib/intervals'

const CACHE_TTL = 60 * 60 * 1000 // 1 hour

// Plan window: covers June → September (full race prep block)
const OLDEST = '2026-06-01'
const NEWEST = '2026-09-01'

export function useIntervals() {
  const [events, setEvents]         = useState(() => getItem('intervals_events', []))
  const [activities, setActivities] = useState(() => getItem('intervals_activities', []))
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [lastSynced, setLastSynced] = useState(() => getItem('intervals_last_synced', null))

  const syncData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [eventsData, activitiesData] = await Promise.all([
        fetchEvents(OLDEST, NEWEST),
        fetchActivities(OLDEST, NEWEST),
      ])
      const now = Date.now()
      setEvents(eventsData)
      setActivities(activitiesData)
      setLastSynced(now)
      setItem('intervals_events', eventsData)
      setItem('intervals_activities', activitiesData)
      setItem('intervals_last_synced', now)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Sync on mount if cache is stale
  useEffect(() => {
    const age = lastSynced ? Date.now() - lastSynced : Infinity
    if (age > CACHE_TTL) syncData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Date-keyed maps for O(1) lookups
  const eventsByDate = useMemo(() =>
    Object.fromEntries(
      events
        .filter(e => e.start_date_local)
        .map(e => [e.start_date_local.slice(0, 10), e])
    ), [events])

  const activitiesByDate = useMemo(() =>
    Object.fromEntries(
      activities
        .filter(a => a.start_date_local)
        .map(a => [a.start_date_local.slice(0, 10), a])
    ), [activities])

  const lastSyncedMins = lastSynced
    ? Math.round((Date.now() - lastSynced) / 60000)
    : null

  return {
    events,
    activities,
    eventsByDate,
    activitiesByDate,
    loading,
    error,
    lastSyncedMins,
    syncData,
  }
}
