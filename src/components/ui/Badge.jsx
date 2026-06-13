const variantClasses = {
  recovery: 'bg-brand-success/10 text-brand-success border border-brand-success/20',
  warning: 'bg-brand-warning/10 text-brand-warning border border-brand-warning/20',
  danger: 'bg-brand-danger/10 text-brand-danger border border-brand-danger/20',
  accent: 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20',
  muted: 'bg-white/5 text-brand-muted border border-white/10',
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
}

export default function Badge({ children, variant = 'muted', size = 'md' }) {
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  )
}
