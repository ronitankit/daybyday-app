'use client'

import { Cloud, CloudOff, Loader2, AlertCircle } from 'lucide-react'
import { useHabitStore } from '@/features/habits/habit-store'
import { cn } from '@/lib/utils/cn'

export function SyncIndicator() {
  const { status } = useHabitStore((s) => s.syncState)

  const config = {
    saved: { icon: Cloud, label: 'All changes saved', className: 'text-muted-foreground/50' },
    syncing: { icon: Loader2, label: 'Saving...', className: 'text-primary animate-spin' },
    offline: { icon: CloudOff, label: 'Offline — changes queued', className: 'text-yellow-500' },
    failed: { icon: AlertCircle, label: 'Sync failed', className: 'text-destructive' },
  }[status]

  const Icon = config.icon

  return (
    <div role="status" aria-label={config.label} aria-live="polite">
      <Icon
        className={cn('h-4 w-4 transition-all', config.className)}
        aria-hidden="true"
      />
      <span className="sr-only">{config.label}</span>
    </div>
  )
}
