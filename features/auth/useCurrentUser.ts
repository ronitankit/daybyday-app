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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_: any, session: any) => {
      setUser(fromSession(session?.user ?? null))
    })

    return () => subscription.unsubscribe()
  }, [])

  return user
}
