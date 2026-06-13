import { useState } from 'react'
import { Card, Badge, StatDisplay, SectionHeader, ProgressBar, RecoveryRing, NudgeBanner, Spinner, EmptyState } from '../components/ui'

export default function Dashboard() {
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  return (
    <div className="px-4 pt-6 pb-6 space-y-4">
      {/* App header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-black text-brand-text tracking-tight">Kadence</h1>
        <span className="text-xs text-brand-muted">Friday, Jun 13</span>
      </div>

      {/* Nudge banner */}
      {!nudgeDismissed && (
        <NudgeBanner
          type="positive"
          message="Strong recovery today — your plan calls for a threshold session. You're primed for it."
          onDismiss={() => setNudgeDismissed(true)}
        />
      )}

      {/* Recovery card */}
      <Card variant="glow">
        <SectionHeader title="Recovery" />
        <div className="flex items-center gap-6">
          <RecoveryRing score={74} size="lg" />
          <div className="flex-1 grid grid-cols-2 gap-3">
            <StatDisplay value="45" unit="ms" label="HRV" size="md" colorClass="text-brand-text" />
            <StatDisplay value="58" unit="bpm" label="Resting HR" size="md" colorClass="text-brand-text" />
            <StatDisplay value="87" unit="%" label="Sleep" size="md" colorClass="text-brand-text" />
            <div className="flex flex-col justify-center">
              <span className="text-xs text-brand-muted uppercase tracking-wider mb-1">Status</span>
              <Badge variant="recovery" size="sm">Peak</Badge>
            </div>
          </div>
        </div>
        <p className="text-xs text-brand-muted mt-3">Last synced 12 mins ago</p>
      </Card>

      {/* Today's workout card */}
      <Card variant="default">
        <SectionHeader title="Today's Workout" action={{ label: 'View Plan', onClick: () => {} }} />
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-brand-text">Threshold Intervals</h3>
            <p className="text-sm text-brand-muted mt-0.5">75 min · Zone 4–5</p>
            <p className="text-sm text-brand-muted/80 mt-2">Warmup → 4×8 min @ threshold → Cooldown</p>
          </div>
          <Badge variant="accent">Week 3</Badge>
        </div>
      </Card>

      {/* Weekly progress */}
      <Card variant="default">
        <SectionHeader title="This Week" />
        <div className="space-y-3">
          <ProgressBar label="Miles" value={68} max={95} unit="mi" />
          <ProgressBar label="Sessions" value={4} max={6} showPercent />
        </div>
      </Card>

      {/* Component showcase section */}
      <Card variant="elevated">
        <SectionHeader title="Component Preview" />
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="recovery">Recovery</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="muted">Muted</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </div>
        </div>
      </Card>
    </div>
  )
}
