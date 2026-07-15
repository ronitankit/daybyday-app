'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sun, Calendar, ListChecks, BarChart2, User,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { NAV_ITEMS } from './nav-items'
import { AvatarUpload } from '@/features/auth/AvatarUpload'
import { useCurrentUser } from '@/features/auth/useCurrentUser'

const ICONS = { sun: Sun, calendar: Calendar, 'list-checks': ListChecks, 'bar-chart-2': BarChart2, user: User }

export function BottomNav() {
  const pathname = usePathname()
  const currentUser = useCurrentUser()

  return (
    <nav
      aria-label="Main navigation"
      className="bottom-nav fixed bottom-0 inset-x-0 z-50 flex md:hidden
        border-t border-border bg-background/95 backdrop-blur-sm"
    >
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const Icon = ICONS[icon as keyof typeof ICONS]
        const active = pathname.startsWith(href)
        const isProfile = icon === 'user'

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2',
              'min-h-[56px] text-[10px] font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]',
              active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {isProfile && currentUser ? (
              <div className={cn(
                'h-5 w-5 rounded-full overflow-hidden ring-2 transition-colors',
                active ? 'ring-primary' : 'ring-transparent',
              )}>
                <AvatarUpload
                  userId={currentUser.id}
                  avatarUrl={currentUser.avatarUrl}
                  size="sm"
                  readOnly
                />
              </div>
            ) : (
              <Icon
                className={cn('h-5 w-5 transition-transform', active && 'scale-110')}
                aria-hidden="true"
                strokeWidth={active ? 2.5 : 2}
              />
            )}
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
