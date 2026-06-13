export default function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-semibold text-brand-muted uppercase tracking-wider">
        {title}
      </span>
      {action && (
        action.href ? (
          <a
            href={action.href}
            className="text-sm text-brand-accent font-medium hover:text-brand-accent-glow transition-colors"
          >
            {action.label}
          </a>
        ) : (
          <button
            onClick={action.onClick}
            className="text-sm text-brand-accent font-medium hover:text-brand-accent-glow transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
