import { useMemo, useState } from 'react'
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
import { getDayOffset, PLAN_START_DATE_DEFAULT } from '../lib/trainingPlan'
import { useIntervals } from '../hooks/useIntervals'
import { useWhoop } from '../hooks/useWhoop'
import { logWeightForDate } from '../lib/weight'

// ── Section 1: Weight Trend ────────────────────────────────────────────────

function WeightSection() {
  const { connected: whoopConnected, bodyData, bodyError } = useWhoop()
  const [logKey, setLogKey] = useState(0)
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0])
  const [manualWeight, setManualWeight] = useState('')

  const weightLog = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('kadence_weight_log') || '[]')
    } catch {
      return []
    }
  }, [bodyData, logKey])

  const hasData = weightLog.length > 0
  const first = hasData ? weightLog[0] : null
  const last = hasData ? weightLog[weightLog.length - 1] : null
  const delta = hasData && weightLog.length > 1
    ? last.weight - first.weight
    : null

  const syncBadge = (() => {
    if (!whoopConnected) return { color: 'bg-gray-600', text: 'Connect Whoop to auto-sync weight', textClass: 'text-gray-600' }
    if (bodyData?.weightLbs) return { color: 'bg-green-500', text: `Syncing from Whoop · ${bodyData.weightLbs.toFixed(2)} lbs`, textClass: 'text-gray-400' }
    if (bodyError === 'scope') return { color: 'bg-yellow-500', text: 'Reconnect Whoop to grant body measurement access', textClass: 'text-gray-500' }
    if (bodyError === 'no_weight') return { color: 'bg-yellow-500', text: 'Set your weight in the Whoop app to sync', textClass: 'text-gray-500' }
    return { color: 'bg-yellow-500', text: 'Body data unavailable — try reconnecting Whoop', textClass: 'text-gray-500' }
  })()

  function handleAddWeight(e) {
    e.preventDefault()
    const w = parseFloat(manualWeight)
    if (!manualDate || isNaN(w) || w <= 0) return
    logWeightForDate(manualDate, w)
    setManualWeight('')
    setLogKey(k => k + 1)
  }

  return (
    <Card variant="default">
      {/* Header row: title left, delta right */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Weight</p>
        {delta !== null && (
          <span className={`text-sm font-bold ${delta < 0 ? 'text-green-400' : 'text-red-400'}`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(2)} lbs
          </span>
        )}
      </div>

      {/* Current weight */}
      {hasData && (
        <p className="text-2xl font-black text-white mb-3">{last.weight.toFixed(2)} <span className="text-sm font-medium text-gray-400">lbs</span></p>
      )}

      {hasData ? (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={weightLog} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
              formatter={v => [`${Number(v).toFixed(2)} lbs`, 'Weight']}
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
      ) : (
        <p className="text-sm text-gray-600 text-center py-4">No weight data yet — add an entry below</p>
      )}

      {/* Manual entry */}
      <form onSubmit={handleAddWeight} className="flex items-center gap-2 mt-3">
        <input
          type="date"
          value={manualDate}
          onChange={e => setManualDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 [color-scheme:dark] flex-shrink-0"
        />
        <input
          type="number"
          value={manualWeight}
          onChange={e => setManualWeight(e.target.value)}
          placeholder="lbs"
          step="0.01"
          min="50"
          max="500"
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 w-20 flex-shrink-0"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
        >
          Add
        </button>
      </form>

      {/* Sync status */}
      <div className="flex items-center gap-1.5 mt-3 text-xs">
        <span className={`w-1.5 h-1.5 rounded-full ${syncBadge.color} shrink-0`} />
        <span className={syncBadge.textClass}>{syncBadge.text}</span>
      </div>
    </Card>
  )
}

// ── Section 2: Weekly Mileage ─────────────────────────────────────────────

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
      const actual = actByWeek[w] ? parseFloat(actByWeek[w].toFixed(1)) : 0
      data.push({ week: `W${w + 1}`, actual })
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
          <Bar dataKey="actual" fill="#3B82F6" radius={[3, 3, 0, 0]} name="Actual" />
        </BarChart>
      </ResponsiveContainer>
      {!hasActual && (
        <p className="text-xs text-gray-600 text-center mt-2">Syncing from Intervals.icu…</p>
      )}
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Trends() {
  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      <h1 className="text-2xl font-black text-white tracking-tight mb-2">Trends</h1>
      <WeightSection />
      <MileageSection />
    </div>
  )
}
