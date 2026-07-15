'use client'

import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main
        id="main-content"
        className="flex-1 overflow-y-auto overflow-x-hidden
          pb-[calc(4rem+env(safe-area-inset-bottom))]
          md:pb-0"
        tabIndex={-1}
      >
        <div className="mx-auto max-w-2xl px-4 py-6 md:max-w-4xl md:px-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
