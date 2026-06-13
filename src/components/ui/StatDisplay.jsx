const sizeConfig = {
  lg: {
    value: 'text-4xl font-black',
    unit: 'text-xl font-semibold text-brand-muted',
    label: 'text-xs text-brand-muted uppercase tracking-wider mt-1',
  },
  md: {
    value: 'text-2xl font-bold',
    unit: 'text-base font-semibold text-brand-muted',
    label: 'text-xs text-brand-muted uppercase tracking-wider mt-0.5',
  },
  sm: {
    value: 'text-lg font-bold',
    unit: 'text-sm font-semibold text-brand-muted',
    label: 'text-xs text-brand-muted uppercase tracking-wider mt-0.5',
  },
}

export default function StatDisplay({ value, unit, label, size = 'lg', colorClass = 'text-brand-text' }) {
  const config = sizeConfig[size]

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-1">
        <span className={`${config.value} ${colorClass}`}>{value}</span>
        {unit && <span className={config.unit}>{unit}</span>}
      </div>
      {label && <span className={config.label}>{label}</span>}
    </div>
  )
}
