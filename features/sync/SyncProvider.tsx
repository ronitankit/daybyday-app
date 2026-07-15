'use client'

import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { flushPendingMutations } from '@/lib/offline/sync'
import { executeMutation } from '@/lib/offline/executor'
import { getPendingMutations } from '@/lib/offline/db'
import { useHabitStore } from '@/features/habits/habit-store'
import { queryKeys } from '@/lib/query/keys'

export function SyncProvider() {
  const queryClient = useQueryClient()
  const setSyncState = useHabitStore((s) => s.setSyncState)

  const flush = useCallback(async () => {
    const pending = await getPendingMutations()
    if (pending.length === 0) return

    setSyncState({ status: 'syncing', pendingCount: pending.length, lastSynced: null })
    const { synced, failed } = await flushPendingMutations(executeMutation)

    if (synced > 0) {
      queryClient.invalidateQueries({ queryKey: queryKeys.habits() })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.streaks() })
    }

    setSyncState({
      status: failed > 0 ? 'failed' : 'saved',
      pendingCount: failed,
      lastSynced: synced > 0 ? Date.now() : null,
    })
  }, [queryClient, setSyncState])

  useEffect(() => {
    const handleOnline = () => flush()

    window.addEventListener('online', handleOnline)
    // Flush on mount in case there are mutations from a previous offline session
    if (navigator.onLine) flush()

    return () => window.removeEventListener('online', handleOnline)
  }, [flush])

  return null
}
