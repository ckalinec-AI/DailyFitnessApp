export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {icon && (
        <div className="text-brand-muted/50 mb-3">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-brand-muted">{title}</p>
      {description && (
        <p className="text-sm text-brand-muted/70 mt-1">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-brand-accent text-white text-sm font-semibold rounded-xl hover:bg-brand-accent-glow transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
