const variantClasses = {
  default: 'bg-brand-surface border border-white/5 rounded-2xl',
  elevated: 'bg-brand-elevated border border-white/5 rounded-2xl',
  glow: 'bg-brand-surface border border-brand-accent/30 rounded-2xl shadow-glow-sm',
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export default function Card({ children, className = '', variant = 'default', padding = 'md' }) {
  return (
    <div className={`${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  )
}
