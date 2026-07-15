'use client'

import { create } from 'zustand'
import type { HabitLog, SyncState } from '@/types'

interface HabitUIState {
  // Optimistic log overrides — keyed by "habitId:date"
  optimisticLogs: Record<string, Partial<HabitLog>>
  syncState: SyncState

  setOptimisticLog: (key: string, log: Partial<HabitLog>) => void
  clearOptimisticLog: (key: string) => void
  setSyncState: (state: SyncState) => void
}

export const useHabitStore = create<HabitUIState>((set) => ({
  optimisticLogs: {},
  syncState: { status: 'saved', pendingCount: 0, lastSynced: null },

  setOptimisticLog: (key, log) =>
    set((s) => ({ optimisticLogs: { ...s.optimisticLogs, [key]: log } })),

  clearOptimisticLog: (key) =>
    set((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _, ...rest } = s.optimisticLogs
      return { optimisticLogs: rest }
    }),

  setSyncState: (syncState) => set({ syncState }),
}))
