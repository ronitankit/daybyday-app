import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="text-muted-foreground text-sm">
        Additional settings — categories, routines, notifications, and data export — coming in the next release.
      </p>
    </div>
  )
}
