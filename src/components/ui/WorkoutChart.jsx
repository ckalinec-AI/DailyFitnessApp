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

  for (const raw of description.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    // "3×5 min Z3 / 3 min Z1" or "3x5min Z3"
    const rptMatch = line.match(/^(\d+)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*m(?:in)?\s+[Zz](\d)/i)
    if (rptMatch) {
      const reps = parseInt(rptMatch[1])
      const mins = parseFloat(rptMatch[2])
      const zone = parseInt(rptMatch[3])
      const recMatch = line.match(/[/+]\s*(\d+(?:\.\d+)?)\s*m(?:in)?\s+[Zz](\d)/i)
      for (let i = 0; i < reps; i++) {
        segs.push({ minutes: mins, zone })
        if (recMatch) segs.push({ minutes: parseFloat(recMatch[1]), zone: parseInt(recMatch[2]) })
      }
      continue
    }

    // "10 min Z2" or "10m Z3"
    const simple = line.match(/(\d+(?:\.\d+)?)\s*m(?:in)?\s+[Zz](\d)/i)
    if (simple) {
      segs.push({ minutes: parseFloat(simple[1]), zone: parseInt(simple[2]) })
      continue
    }

    // "Warmup 10 min" / "Cooldown 15 min" → Z2
    const warm = line.match(/(?:warm|cool|easy)\w*\s+(\d+)\s*m(?:in)?/i)
    if (warm) segs.push({ minutes: parseInt(warm[1]), zone: 2 })
  }

  return segs
}

export default function WorkoutChart({ segments = [], compact = false }) {
  if (!segments.length) return null
  const total = segments.reduce((s, seg) => s + seg.minutes, 0)
  if (total === 0) return null

  const zoneSet = [...new Set(segments.map(s => s.zone))].sort()

  return (
    <div className="w-full">
      <div
        className="w-full rounded-full overflow-hidden flex"
        style={{ height: compact ? 6 : 10 }}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              flex: seg.minutes,
              backgroundColor: ZONE_COLORS[seg.zone] ?? ZONE_COLORS[1],
            }}
          />
        ))}
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {zoneSet.map(z => (
            <span key={z} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span
                className="inline-block w-1.5 h-1.5 rounded-sm shrink-0"
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
