'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { AvatarUpload } from './AvatarUpload'
import { useCurrentUser } from './useCurrentUser'

export function ProfileView() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const user = useCurrentUser()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const THEMES = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      {/* User info */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            {user ? (
              <AvatarUpload
                userId={user.id}
                avatarUrl={user.avatarUrl}
                size="lg"
              />
            ) : (
              <AvatarUpload
                userId=""
                avatarUrl={null}
                size="lg"
                readOnly
              />
            )}

            <div>
              {user ? (
                <>
                  <p className="font-semibold">{user.fullName ?? 'User'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tap the photo to update it
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Guest User</p>
                  <p className="text-sm text-muted-foreground">
                    <Button variant="link" onClick={() => router.push('/auth/login')} className="p-0 h-auto">
                      Sign in to sync your data
                    </Button>
                  </p>
                </>
              )}
            </div>
          </div>

          {!user && (
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={() => router.push('/auth/register')}>
                Create account
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => router.push('/auth/login')}>
                Sign in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-pressed={theme === value}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-ring min-h-[56px]',
                  theme === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-accent',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sign out */}
      {user && (
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
          disabled={isLoading}
        >
          <LogOut className="h-4 w-4" />
          {isLoading ? 'Signing out...' : 'Sign out'}
        </Button>
      )}

      {/* App info */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p className="font-semibold">DayByDay</p>
        <p>Build lasting habits, one day at a time.</p>
      </div>
    </div>
  )
}
