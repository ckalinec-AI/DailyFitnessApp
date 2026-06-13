const typeConfig = {
  warning: {
    border: 'border-brand-warning',
    bg: 'bg-brand-warning/5',
    iconColor: 'text-brand-warning',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  positive: {
    border: 'border-brand-success',
    bg: 'bg-brand-success/5',
    iconColor: 'text-brand-success',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  info: {
    border: 'border-brand-accent',
    bg: 'bg-brand-accent/5',
    iconColor: 'text-brand-accent',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
}

export default function NudgeBanner({ message, type = 'info', onDismiss }) {
  const config = typeConfig[type]

  return (
    <div className={`border-l-4 ${config.border} ${config.bg} rounded-xl p-3 flex items-start gap-2`}>
      <span className={`flex-shrink-0 mt-0.5 ${config.iconColor}`}>
        {config.icon}
      </span>
      <span className="text-sm text-brand-text flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-brand-muted hover:text-brand-text transition-colors"
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}
