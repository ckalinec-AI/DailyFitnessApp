import { useEffect, useState } from 'react'

export default function MetricRing({ pct = 0, value, label, color = '#3B82F6', unit = '', size = 88, strokeWidth = 7 }) {
  const [animated, setAnimated] = useState(false)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2
  const clampedPct = Math.min(100, Math.max(0, pct || 0))
  const dashOffset = circumference * (1 - (animated ? clampedPct : 0) / 100)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const hasData = value != null

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth}
          />
          {hasData && (
            <circle
              cx={center} cy={center} r={radius}
              fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {hasData ? (
            <span className="text-xl font-black text-white leading-none">
              {value}{unit}
            </span>
          ) : (
            <span className="text-lg font-bold text-white/20">—</span>
          )}
        </div>
      </div>
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{label}</span>
    </div>
  )
}
