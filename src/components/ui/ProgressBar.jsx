export default function ProgressBar({
  label,
  value,
  max,
  unit,
  showPercent = false,
  colorClass = 'bg-brand-accent',
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-brand-text">{label}</span>
        <span className="text-sm text-brand-muted">
          {showPercent
            ? `${Math.round(percent)}%`
            : `${value}/${max}${unit ? ` ${unit}` : ''}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
