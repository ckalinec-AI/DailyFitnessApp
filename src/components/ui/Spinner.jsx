const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <div
      className={`${sizeClasses[size]} border-2 border-white/20 border-t-brand-accent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
