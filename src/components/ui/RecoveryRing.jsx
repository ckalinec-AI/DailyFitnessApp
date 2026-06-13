import { useEffect, useState } from 'react'

function getColor(score) {
  if (score >= 67) return '#10B981'
  if (score >= 34) return '#F59E0B'
  return '#EF4444'
}

const sizeConfig = {
  lg: {
    diameter: 120,
    strokeWidth: 8,
    valueClass: 'text-3xl font-black',
  },
  md: {
    diameter: 80,
    strokeWidth: 6,
    valueClass: 'text-xl font-bold',
  },
}

export default function RecoveryRing({ score = 0, size = 'lg', showLabel = true }) {
  const [animated, setAnimated] = useState(false)
  const config = sizeConfig[size]

  const { diameter, strokeWidth } = config
  const radius = (diameter - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = diameter / 2

  const clampedScore = Math.min(100, Math.max(0, score))
  const dashOffset = circumference * (1 - (animated ? clampedScore : 0) / 100)
  const color = getColor(clampedScore)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: diameter, height: diameter }}>
        <svg
          width={diameter}
          height={diameter}
          viewBox={`0 0 ${diameter} ${diameter}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Colored arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        {/* Score label centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${config.valueClass} text-brand-text`}>{clampedScore}</span>
        </div>
      </div>
      {showLabel && (
        <span className="text-xs text-brand-muted uppercase tracking-wider">Recovery</span>
      )}
    </div>
  )
}
