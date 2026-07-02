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

// Parse intervals.icu description text into segments (best-effort).
// Splits into per-segment chunks (Warmup / Main Set Nx / Cooldown / bare
// recovery lines) so a restated duration ("15m ... 15 min warm-up") isn't
// double-counted, and pulls exactly one duration+zone out of each chunk.
export function parseWorkoutSegments(description) {
  if (!description) return []
  let text = description.replace(/<[^>]+>/g, ' ').replace(/&[a-z#\d]+;/gi, ' ')

  // Prefer the structured breakdown over any summary sentence that precedes it
  const labelMatch = text.match(/\bwarm[-\s]?up\b|\bmain\s*set\b|\bcool[-\s]?down\b/i)
  if (labelMatch) text = text.slice(labelMatch.index)

  const chunks = text
    .split(/\n+|(?=\bwarm[-\s]?up\b|\bmain\s*set\s*\d+\s*[x×X]|\bcool[-\s]?down\b|(?:[.]\s*-\s*\d))/i)
    .map(c => c.trim())
    .filter(Boolean)

  const DUR = /(\d+)\s*[x×X]\s*-?\s*(\d+(?:\.\d+)?)\s*m(?:in(?:s|utes)?)?\b|(\d+(?:\.\d+)?)\s*m(?:in(?:s|utes)?)?\b/i
  const REST_KW = 'easy|rec(?:overy)?|\\brest\\b|\\bspin\\b|active'

  function inferZone(chunk) {
    const z = chunk.match(/\bz\s*(\d)\b/i)
    if (z) return parseInt(z[1], 10)
    if (/warm[-\s]?up|cool[-\s]?down/i.test(chunk)) return 2
    if (new RegExp(REST_KW, 'i').test(chunk)) return 1
    if (/tempo/i.test(chunk)) return 3
    if (/threshold|sst|sweet\s*spot/i.test(chunk)) return 4
    if (/vo2|anaerobic/i.test(chunk)) return 5
    return null
  }

  const parsed = []
  for (const chunk of chunks) {
    const m = chunk.match(DUR)
    if (!m) continue
    const reps = m[1] ? parseInt(m[1], 10) : 1
    const mins = parseFloat(m[2] ?? m[3])
    const zone = inferZone(chunk) ?? 1

    // Inline recovery within the same chunk: "/ 3 min Z1" or "/ 3 min easy"
    const after = chunk.slice(m.index + m[0].length)
    const recZ = after.match(/[/+]\s*(\d+(?:\.\d+)?)\s*m(?:in(?:s|utes)?)?\s+[Zz](\d)/i)
    const recKw = !recZ && after.match(new RegExp(`[/+]\\s*(\\d+(?:\\.\\d+)?)\\s*m(?:in(?:s|utes)?)?\\s+(?:${REST_KW})`, 'i'))
    const inlineRec = recZ
      ? { minutes: parseFloat(recZ[1]), zone: parseInt(recZ[2]) }
      : recKw ? { minutes: parseFloat(recKw[1]), zone: 1 } : null

    parsed.push({ reps, mins, zone, inlineRec })
  }
  if (!parsed.length) return []

  // Expand reps: inline recovery takes priority; otherwise pair a reps>1
  // chunk with the very next single chunk (e.g. "Main Set 4x…" + "- 4m easy")
  const segs = []
  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i]
    if (p.reps > 1) {
      const next = !p.inlineRec && parsed[i + 1]?.reps === 1 ? parsed[i + 1] : null
      for (let r = 0; r < p.reps; r++) {
        segs.push({ minutes: p.mins, zone: p.zone })
        if (p.inlineRec) segs.push(p.inlineRec)
        else if (next) segs.push({ minutes: next.mins, zone: next.zone })
      }
      if (next) i++
    } else {
      segs.push({ minutes: p.mins, zone: p.zone })
    }
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
