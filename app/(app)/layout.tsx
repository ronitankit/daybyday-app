import { AppShell } from '@/features/navigation/AppShell'
import { GuestMigrationWatcher } from '@/features/auth/GuestMigrationWatcher'

// All (app) routes use cookies for auth — force dynamic rendering
export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <GuestMigrationWatcher />
      {children}
    </AppShell>
  )
}
