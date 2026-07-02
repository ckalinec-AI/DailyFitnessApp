const ZONE_COLORS = {
  1: '#6B7280',
  2: '#10B981',
  3: '#F59E0B',
  4: '#F97316',
  5: '#EF4444',
}

const ZONE_NAMES = {
  1: 'Z1 Recovery',
  2: 'Z2 Endurance',
  3: 'Z3 Tempo',
  4: 'Z4 Threshold',
  5: 'Z5 VO2',
}

// Block height as a fraction of chart height — higher zone = taller block
const ZONE_H = { 1: 0.14, 2: 0.35, 3: 0.57, 4: 0.78, 5: 1.0 }

// Convert JSON plan steps array to [{ minutes, zone }]
export function stepsToSegments(steps) {
  if (!steps?.length) return []
  const segs = []

  function process(step) {
    const repeats = parseInt(step.repeats, 10) || 1
    if (step.type === 'repeat' && step.subSteps?.length) {
      for (let i = 0; i < repeats; i++) step.subSteps.forEach(process)
    } else {
      const mins = (parseInt(step.duration, 10) || 0) / 60
      const zone = parseInt(step.startValue, 10) || 1
      if (mins > 0) segs.push({ minutes: mins, zone })
    }
  }

  steps.forEach(process)
  return segs
}

// Parse intervals.icu description text into segments (best-effort)
export function parseWorkoutSegments(description) {
  if (!description) return []
  const segs = []

  // Strip HTML tags and decode common entities so raw HTML descriptions work
  const text = description.replace(/<[^>]+>/g, ' ').replace(/&[a-z#\d]+;/gi, ' ')
  const DUR = 'm(?:in(?:s|utes)?)?'
  const REST_KW = '(?:easy|rec(?:overy)?|rest|spin|active)'

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    // "3×5 min Z3 / 3 min Z1" — no ^ anchor so labeled lines like "Main: 3×…" work
    const rptMatch = line.match(new RegExp(`(\\d+)\\s*[×xX]\\s*(\\d+(?:\\.\\d+)?)\\s*${DUR}\\s+[Zz](\\d)`, 'i'))
    if (rptMatch) {
      const reps = parseInt(rptMatch[1])
      const mins = parseFloat(rptMatch[2])
      const zone = parseInt(rptMatch[3])
      // Recovery with explicit zone: "/ 3 min Z1"
      const recMatch = line.match(new RegExp(`[/+]\\s*(\\d+(?:\\.\\d+)?)\\s*${DUR}\\s+[Zz](\\d)`, 'i'))
      if (recMatch) {
        for (let i = 0; i < reps; i++) {
          segs.push({ minutes: mins, zone })
          segs.push({ minutes: parseFloat(recMatch[1]), zone: parseInt(recMatch[2]) })
        }
        continue
      }
      // Recovery with keyword: "/ 3 min easy" → Z1
      const restKw = line.match(new RegExp(`[/+]\\s*(\\d+(?:\\.\\d+)?)\\s*${DUR}\\s+${REST_KW}`, 'i'))
      if (restKw) {
        for (let i = 0; i < reps; i++) {
          segs.push({ minutes: mins, zone })
          segs.push({ minutes: parseFloat(restKw[1]), zone: 1 })
        }
        continue
      }
      // No recovery found — just push the work reps
      for (let i = 0; i < reps; i++) segs.push({ minutes: mins, zone })
      continue
    }

    // "10 min Z2" or "10m Z3" or "10 minutes Z4"
    const simple = line.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${DUR}\\s+[Zz](\\d)`, 'i'))
    if (simple) {
      segs.push({ minutes: parseFloat(simple[1]), zone: parseInt(simple[2]) })
      continue
    }

    // "5 min easy" / "4 min recovery" / "3 min rest" → Z1
    const rec = line.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${DUR}\\s+${REST_KW}`, 'i'))
    if (rec) {
      segs.push({ minutes: parseFloat(rec[1]), zone: 1 })
      continue
    }

    // "Warmup 10 min" / "Cooldown 15 min" → Z2
    const warm = line.match(new RegExp(`(?:warm|cool)\\w*\\s+(\\d+)\\s*${DUR}`, 'i'))
    if (warm) segs.push({ minutes: parseInt(warm[1]), zone: 2 })
  }

  return segs
}

export default function WorkoutChart({ segments = [], compact = false }) {
  if (!segments.length) return null
  const total = segments.reduce((s, seg) => s + seg.minutes, 0)
  if (total === 0) return null

  const chartH = compact ? 36 : 76
  const zoneSet = [...new Set(segments.map(s => s.zone))].sort()

  return (
    <div className="w-full">
      {/* Zone profile chart — blocks sit at the bottom, height = zone level */}
      <div
        className="w-full rounded-xl overflow-hidden"
        style={{ height: chartH, backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <div
          className="h-full flex items-end"
          style={{ gap: 1.5, padding: '0 1.5px' }}
        >
          {segments.map((seg, i) => {
            const hPct = (ZONE_H[seg.zone] ?? ZONE_H[1]) * 100
            const color = ZONE_COLORS[seg.zone] ?? ZONE_COLORS[1]
            return (
              <div
                key={i}
                style={{
                  flex: seg.minutes,
                  height: `${hPct}%`,
                  minWidth: 2,
                  background: `linear-gradient(to bottom, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 55%), ${color}`,
                  borderRadius: '3px 3px 0 0',
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Zone legend */}
      {!compact && zoneSet.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {zoneSet.map(z => (
            <span key={z} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span
                className="inline-block w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: ZONE_COLORS[z] }}
              />
              {ZONE_NAMES[z]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
