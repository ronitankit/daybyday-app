'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sun, Calendar, ListChecks, BarChart2, User, Plus, Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { NAV_ITEMS } from './nav-items'

const ICONS = {
  sun: Sun,
  calendar: Calendar,
  'list-checks': ListChecks,
  'bar-chart-2': BarChart2,
  user: User,
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      aria-label="Sidebar navigation"
      className="hidden md:flex md:w-56 lg:w-64 flex-col border-r border-border
        bg-background h-full shrink-0"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Flame className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <span className="text-base font-semibold tracking-tight">DayByDay</span>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1" aria-label="Main navigation">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const Icon = ICONS[icon as keyof typeof ICONS]
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                'transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
                strokeWidth={active ? 2.5 : 2}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Add habit CTA */}
      <div className="p-3 border-t border-border">
        <Link
          href="/habits/new"
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5',
            'bg-primary text-primary-foreground text-sm font-medium',
            'hover:bg-primary/90 transition-colors',
            'focus-visible:outline-2 focus-visible:outline-ring',
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Habit
        </Link>
      </div>
    </aside>
  )
}
