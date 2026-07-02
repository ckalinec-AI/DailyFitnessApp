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
// Splits on real newlines only — section labels ("Warmup", "Main Set 4x",
// "Cooldown") always sit on their own line in practice. Splitting on the
// keyword text itself (instead of newlines) would also fire on mid-sentence
// restatements like "15 min warm-up" and fragment that line's own chunk.
// A repeat header on its own line ("Main Set 4x") has no duration of its
// own, so its multiplier is carried forward and applied to the group of
// body lines that follow, until the next header/blank-separated section.
export function parseWorkoutSegments(description) {
  if (!description) return []
  let text = description.replace(/<[^>]+>/g, ' ').replace(/&[a-z#\d]+;/gi, ' ')

  // Prefer the structured breakdown over any summary sentence that precedes it
  const labelMatch = text.match(/\bwarm[-\s]?up\b|\bmain\s*set\b|\bcool[-\s]?down\b/i)
  if (labelMatch) text = text.slice(labelMatch.index)

  const chunks = text.split(/\n+/).map(c => c.trim()).filter(Boolean)

  const DUR = /(\d+)\s*[x×X]\s*-?\s*(\d+(?:\.\d+)?)\s*m(?:in(?:s|utes)?)?\b|(\d+(?:\.\d+)?)\s*m(?:in(?:s|utes)?)?\b/i
  const REST_KW = 'easy|rec(?:overy)?|\\brest\\b|\\bspin\\b|active'
  // A line that is JUST a section label, optionally with a repeat count
  // ("Warmup", "Main Set 4x", "Cooldown") or a bare "4x"/"3×" repeat marker
  const HEADER_ONLY_RE = /^\s*(?:(?:warm[-\s]?up|cool[-\s]?down|main\s*set)\s*(?:(\d+)\s*[x×X])?|(\d+)\s*[x×X])\s*[:.]?\s*$/i

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

  function parseBody(chunk) {
    const m = chunk.match(DUR)
    if (!m) return null
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

    return { reps, mins, zone, inlineRec }
  }

  // Group consecutive body lines under the most recent repeat header
  const groups = []
  let activeMultiplier = 1
  let currentBodies = []

  function flushGroup() {
    if (currentBodies.length) groups.push({ multiplier: activeMultiplier, bodies: currentBodies })
    currentBodies = []
    activeMultiplier = 1
  }

  for (const chunk of chunks) {
    const headerOnly = chunk.match(HEADER_ONLY_RE)
    if (headerOnly) {
      flushGroup()
      const reps = headerOnly[1] ?? headerOnly[2]
      activeMultiplier = reps ? parseInt(reps, 10) : 1
      continue
    }
    const body = parseBody(chunk)
    if (body) currentBodies.push(body)
  }
  flushGroup()
  if (!groups.length) return []

  // Expand each group: a body's own inline reps (e.g. "3×5 min Z3 / 3 min
  // Z1") expands first, then the header's repeat count (if any) repeats
  // the whole resulting sequence of body lines as a unit.
  const segs = []
  for (const group of groups) {
    const expanded = []
    for (const b of group.bodies) {
      if (b.reps > 1) {
        for (let r = 0; r < b.reps; r++) {
          expanded.push({ minutes: b.mins, zone: b.zone })
          if (b.inlineRec) expanded.push(b.inlineRec)
        }
      } else {
        expanded.push({ minutes: b.mins, zone: b.zone })
      }
    }
    if (group.multiplier > 1) {
      for (let r = 0; r < group.multiplier; r++) segs.push(...expanded)
    } else {
      segs.push(...expanded)
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
