'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export interface CurrentUser {
  id: string
  email?: string
  fullName?: string
  avatarUrl?: string
}

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const fromSession = (u: { id: string; email?: string; user_metadata?: Record<string, string> } | null) => {
      if (!u) return null
      return {
        id: u.id,
        email: u.email,
        fullName: u.user_metadata?.full_name ?? u.user_metadata?.name,
        avatarUrl: u.user_metadata?.avatar_url,
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.auth.getUser().then(({ data }: any) => setUser(fromSession(data.user)))

    // Re-fetch from the server on every auth transition rather than trusting
    // session.user directly — right after sign-in that object can lag behind
    // the latest user_metadata (e.g. a freshly uploaded avatar_url), which
    // made the avatar disappear until the next reload.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_: any, session: any) => {
        if (!session?.user) {
          setUser(null)
          return
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase.auth.getUser().then(({ data }: any) => setUser(fromSession(data.user)))
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  return user
}
