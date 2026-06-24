import { useMemo } from 'react'
import { format } from 'date-fns'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import Card from '../components/ui/Card'
import SectionHeader from '../components/ui/SectionHeader'
import EmptyState from '../components/ui/EmptyState'
import { getWorkoutForOffset, getDayOffset, getDateForOffset, PLAN_START_DATE_DEFAULT } from '../lib/trainingPlan'
import { useIntervals } from '../hooks/useIntervals'
import { useWhoop } from '../hooks/useWhoop'

// ── Icons ──────────────────────────────────────────────────────────────────

function HeartbeatIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

// ── Section 1: Weight Trend ────────────────────────────────────────────────

function WeightSection() {
  const { connected: whoopConnected, bodyData } = useWhoop()

  const weightLog = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('kadence_weight_log') || '[]')
    } catch {
      return []
    }
  }, [bodyData]) // re-read after each Whoop sync that may have written a new entry

  const hasData = weightLog.length > 0
  const first = hasData ? weightLog[0] : null
  const last = hasData ? weightLog[weightLog.length - 1] : null
  const delta = hasData && weightLog.length > 1
    ? (last.weight - first.weight).toFixed(1)
    : null

  return (
    <Card variant="default">
      <SectionHeader title="Weight" />

      {/* Whoop sync badge */}
      <div className="flex items-center gap-1.5 mb-3 text-xs">
        {whoopConnected ? (
          bodyData?.weightLbs ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="text-gray-400">
                Syncing from Whoop · {bodyData.weightLbs} lbs
              </span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
              <span className="text-gray-500">Whoop connected — waiting for body data</span>
            </>
          )
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-600 shrink-0" />
            <span className="text-gray-600">Connect Whoop to auto-sync weight from Apple Health</span>
          </>
        )}
      </div>

      {hasData ? (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={weightLog} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: '#4B5563', fontSize: 10 }}
                tickFormatter={d => format(new Date(d + 'T00:00:00'), 'M/d')}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#4B5563', fontSize: 10 }}
                domain={['dataMin - 3', 'dataMax + 3']}
              />
              <Tooltip
                contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9CA3AF', fontSize: 11 }}
                itemStyle={{ color: '#fff' }}
                formatter={v => [`${v} lbs`, 'Weight']}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#weightGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="text-white font-semibold">Current: {last.weight} lbs</span>
            {delta !== null && (
              <span className="text-gray-400">
                Start: {first.weight} lbs &nbsp;·&nbsp; Δ {delta > 0 ? '+' : ''}{delta} lbs
              </span>
            )}
          </div>
        </>
      ) : (
        <EmptyState
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
          title="No weight data yet"
          description={whoopConnected ? 'Weight will appear here once Whoop syncs body measurements' : 'Connect Whoop to sync weight automatically from Apple Health'}
        />
      )}
    </Card>
  )
}

// ── Section 2: HRV Trend ──────────────────────────────────────────────────

function HRVSection() {
  const whoopConnected = useMemo(
    () => Boolean(localStorage.getItem('kadence_whoop_access_token')),
    []
  )

  return (
    <Card variant="default">
      <SectionHeader title="HRV · 30 Days" />
      {whoopConnected ? (
        <EmptyState
          icon={<HeartbeatIcon />}
          title="No HRV data"
          description="HRV data will appear here once Whoop syncs your readings"
        />
      ) : (
        <EmptyState
          icon={<HeartbeatIcon />}
          title="No HRV data"
          description="Connect your Whoop to see 30-day HRV trends"
        />
      )}
    </Card>
  )
}

// ── Section 3: Weekly Mileage ─────────────────────────────────────────────

function MileageSection() {
  const { activities } = useIntervals()

  const weekData = useMemo(() => {
    const currentOffset = getDayOffset(PLAN_START_DATE_DEFAULT)
    const currentWeek = Math.max(0, Math.floor(currentOffset / 7))

    // Build actual miles per week from intervals.icu activities
    const actByWeek = {}
    activities.forEach(a => {
      if (!a.start_date_local || !a.distance) return
      const dateStr = a.start_date_local.slice(0, 10)
      const offset = getDayOffset(PLAN_START_DATE_DEFAULT, new Date(dateStr + 'T12:00:00'))
      if (offset < 0) return
      const w = Math.floor(offset / 7)
      actByWeek[w] = (actByWeek[w] || 0) + a.distance / 1609.34
    })

    const data = []
    for (let w = Math.max(0, currentWeek - 5); w <= currentWeek; w++) {
      let planned = 0
      for (let d = 0; d < 7; d++) {
        const workout = getWorkoutForOffset(w * 7 + d)
        const match = workout?.name?.match(/~(\d+)\s*mi/)
        if (match) planned += parseInt(match[1], 10)
      }
      const actual = actByWeek[w] ? parseFloat(actByWeek[w].toFixed(1)) : 0
      data.push({ week: `W${w + 1}`, planned, actual })
    }
    return data
  }, [activities])

  const hasActual = weekData.some(w => w.actual > 0)

  return (
    <Card variant="default">
      <SectionHeader title="Weekly Mileage" />
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={weekData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="week" tick={{ fill: '#4B5563', fontSize: 10 }} />
          <YAxis tick={{ fill: '#4B5563', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
            itemStyle={{ color: '#fff' }}
            formatter={(v, name) => [`${v} mi`, name]}
          />
          <Bar dataKey="planned" fill="#1D4ED8" opacity={0.5} radius={[3, 3, 0, 0]} name="Planned" />
          <Bar dataKey="actual"  fill="#3B82F6" radius={[3, 3, 0, 0]} name="Actual" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-800 opacity-50" />
            Planned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
            Actual
          </span>
        </div>
        {!hasActual && (
          <span className="text-xs text-gray-600">Syncing from Intervals.icu…</span>
        )}
      </div>
    </Card>
  )
}

// ── Section 4: Sleep Trend ────────────────────────────────────────────────

function SleepSection() {
  const whoopConnected = useMemo(
    () => Boolean(localStorage.getItem('kadence_whoop_access_token')),
    []
  )

  return (
    <Card variant="default">
      <SectionHeader title="Sleep Score · 7 Days" />
      {whoopConnected ? (
        <EmptyState
          icon={<MoonIcon />}
          title="No sleep data"
          description="Sleep data will appear here once Whoop syncs your readings"
        />
      ) : (
        <EmptyState
          icon={<MoonIcon />}
          title="No sleep data"
          description="Connect your Whoop to see 7-day sleep score trends"
        />
      )}
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Trends() {
  return (
    <div className="px-4 pt-6 pb-8 space-y-4">
      <h1 className="text-2xl font-black text-white tracking-tight mb-2">Trends</h1>
      <WeightSection />
      <HRVSection />
      <MileageSection />
      <SleepSection />
    </div>
  )
}
