'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useGuestMigration } from './useGuestMigration'

export function GuestMigrationWatcher() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    supabase.auth.getUser().then((res: { data: { user: { id: string } | null } }) => {
      setUserId(res.data.user?.id ?? null)
    })
  }, [])

  useGuestMigration(userId)
  return null
}
