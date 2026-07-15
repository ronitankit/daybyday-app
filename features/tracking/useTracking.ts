'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useHabitStore } from '@/features/habits/habit-store'
import { deriveOutcome } from '@/domain/streaks/streak-engine'
import { todayString } from '@/lib/utils/date'
import { enqueueMutation } from '@/lib/offline/db'
import { checkAndAwardAchievements } from '@/features/achievements/checkAchievements'
import type { HabitLog, LogProgressInput, SkipHabitInput, Habit } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Fetch logs for a single date
// ─────────────────────────────────────────────────────────────────────────────

async function fetchLogsForDate(date: string) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*, events:habit_log_events(*)')
    .eq('log_date', date)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as HabitLog[]
}

export function useLogsForDate(date: string) {
  return useQuery({
    queryKey: queryKeys.allLogsForDate(date),
    queryFn: () => fetchLogsForDate(date),
    staleTime: 30 * 1000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch logs for a habit in a date range
// ─────────────────────────────────────────────────────────────────────────────

export function useHabitLogs(habitId: string, from: string, to: string) {
  const supabase = getSupabaseBrowserClient()
  return useQuery({
    queryKey: queryKeys.logsForRange(habitId, from, to),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*, events:habit_log_events(*)')
        .eq('habit_id', habitId)
        .gte('log_date', from)
        .lte('log_date', to)
        .order('log_date', { ascending: false })
      if (error) throw error
      return data as HabitLog[]
    },
    staleTime: 60 * 1000,
    enabled: !!habitId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch all logs for a date range (for analytics)
// ─────────────────────────────────────────────────────────────────────────────

export function useLogsForDateRange(from: string, to: string) {
  const supabase = getSupabaseBrowserClient()
  return useQuery({
    queryKey: queryKeys.logsForDateRange(from, to),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('habit_id, log_date, outcome')
        .gte('log_date', from)
        .lte('log_date', to)
      if (error) throw error
      return data as Array<{ habit_id: string; log_date: string; outcome: string | null }>
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!from && !!to,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Log progress — optimistic update then server sync
// ─────────────────────────────────────────────────────────────────────────────

export function useLogProgress() {
  const queryClient = useQueryClient()
  const setOptimistic = useHabitStore((s) => s.setOptimisticLog)
  const clearOptimistic = useHabitStore((s) => s.clearOptimisticLog)
  const setSyncState = useHabitStore((s) => s.setSyncState)
  const supabase = getSupabaseBrowserClient()

  return useMutation({
    mutationFn: async (input: LogProgressInput & { habit: Habit; isScheduled: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { habit_id, log_date, value, note, habit, isScheduled } = input

      const { data: existingLog } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('habit_id', habit_id)
        .eq('log_date', log_date)
        .maybeSingle()

      const newTotal = (existingLog?.total_value ?? 0) + value
      const isToday = log_date === todayString()
      const outcome = deriveOutcome(habit, newTotal, false, false, isScheduled, isToday)

      const logId = existingLog?.id ?? crypto.randomUUID()

      if (!existingLog) {
        const { error } = await supabase.from('habit_logs').insert({
          id: logId,
          habit_id,
          user_id: user.id,
          log_date,
          total_value: newTotal,
          outcome,
        })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('habit_logs')
          .update({ total_value: newTotal, outcome })
          .eq('id', logId)
        if (error) throw error
      }

      await supabase.from('habit_log_events').insert({
        id: crypto.randomUUID(),
        log_id: logId,
        habit_id,
        user_id: user.id,
        value,
        note,
      })

      return { logId, newTotal, outcome }
    },

    onMutate: async (input) => {
      setSyncState({ status: 'syncing', pendingCount: 1, lastSynced: null })
      const key = `${input.habit_id}:${input.log_date}`

      const current = queryClient.getQueryData<HabitLog[]>(
        queryKeys.allLogsForDate(input.log_date),
      ) ?? []
      const existing = current.find(l => l.habit_id === input.habit_id)
      const newTotal = (existing?.total_value ?? 0) + input.value

      setOptimistic(key, {
        habit_id: input.habit_id,
        log_date: input.log_date,
        total_value: newTotal,
      })

      queryClient.setQueryData<HabitLog[]>(
        queryKeys.allLogsForDate(input.log_date),
        (old) => {
          const updated = old ?? []
          const idx = updated.findIndex(l => l.habit_id === input.habit_id)
          if (idx === -1) {
            return [...updated, {
              id: crypto.randomUUID(),
              habit_id: input.habit_id,
              user_id: '',
              log_date: input.log_date,
              total_value: newTotal,
              outcome: null,
              note: input.note ?? null,
              skip_reason: null,
              skipped_at: null,
              is_excused: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }]
          }
          return updated.map((l, i) =>
            i === idx ? { ...l, total_value: newTotal } : l,
          )
        },
      )

      return { key, newTotal }
    },

    onSuccess: async (result, input, ctx) => {
      clearOptimistic(ctx!.key)
      setSyncState({ status: 'saved', pendingCount: 0, lastSynced: Date.now() })
      queryClient.invalidateQueries({ queryKey: queryKeys.allLogsForDate(input.log_date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.streaks() })

      // Fire-and-forget achievement check on completions
      if (result.outcome === 'completed') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { count } = await supabase
            .from('habit_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('outcome', 'completed')
          checkAndAwardAchievements({
            userId: user.id,
            maxStreak: 0, // streak check requires heavier computation; habits page triggers that
            totalCompleted: count ?? 0,
          }).catch(() => {})
        }
      }
    },

    onError: async (err, input, ctx) => {
      if (ctx?.key) clearOptimistic(ctx.key)

      if (!navigator.onLine) {
        await enqueueMutation({
          id: crypto.randomUUID(),
          type: 'log_progress',
          payload: {
            habit_id: input.habit_id,
            log_date: input.log_date,
            total_value: ctx?.newTotal ?? input.value,
            note: input.note ?? null,
          },
          createdAt: Date.now(),
        })
        setSyncState({ status: 'offline', pendingCount: 1, lastSynced: null })
        toast.info('Offline — progress saved locally and will sync when reconnected.')
        return
      }

      setSyncState({ status: 'failed', pendingCount: 1, lastSynced: null })
      queryClient.invalidateQueries({ queryKey: queryKeys.allLogsForDate(input.log_date) })
      toast.error('Failed to save progress. Check your connection.')
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Skip habit
// ─────────────────────────────────────────────────────────────────────────────

export function useSkipHabit() {
  const queryClient = useQueryClient()
  const setSyncState = useHabitStore((s) => s.setSyncState)
  const supabase = getSupabaseBrowserClient()

  return useMutation({
    mutationFn: async (input: SkipHabitInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { habit_id, log_date, skip_reason, is_excused, note } = input
      const outcome = is_excused ? 'excused_skip' : 'skipped'

      const { error } = await supabase.from('habit_logs').upsert(
        {
          id: crypto.randomUUID(),
          habit_id,
          user_id: user.id,
          log_date,
          outcome,
          total_value: 0,
          skip_reason,
          is_excused,
          note,
          skipped_at: new Date().toISOString(),
        },
        { onConflict: 'habit_id,log_date', ignoreDuplicates: false },
      )
      if (error) throw error
    },

    onSuccess: (_r, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allLogsForDate(input.log_date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.streaks() })
    },

    onError: async (err, input) => {
      if (!navigator.onLine) {
        const outcome = input.is_excused ? 'excused_skip' : 'skipped'
        await enqueueMutation({
          id: crypto.randomUUID(),
          type: 'skip_habit',
          payload: {
            habit_id: input.habit_id,
            log_date: input.log_date,
            outcome,
            skip_reason: input.skip_reason ?? null,
            is_excused: input.is_excused,
            note: input.note ?? null,
            skipped_at: new Date().toISOString(),
          },
          createdAt: Date.now(),
        })
        setSyncState({ status: 'offline', pendingCount: 1, lastSynced: null })
        toast.info('Offline — skip saved locally.')
        return
      }
      toast.error(`Failed to skip: ${err.message}`)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle binary habit (one-tap)
// ─────────────────────────────────────────────────────────────────────────────

export function useToggleBinaryHabit() {
  const queryClient = useQueryClient()
  const supabase = getSupabaseBrowserClient()
  const setSyncState = useHabitStore((s) => s.setSyncState)

  return useMutation({
    mutationFn: async ({
      habit_id,
      log_date,
      currentOutcome,
    }: {
      habit_id: string
      log_date: string
      currentOutcome: string | null
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const isCompleted = currentOutcome === 'completed'
      const newOutcome = isCompleted ? null : 'completed'
      const newValue = isCompleted ? 0 : 1

      const { error } = await supabase.from('habit_logs').upsert(
        {
          id: crypto.randomUUID(),
          habit_id,
          user_id: user.id,
          log_date,
          outcome: newOutcome,
          total_value: newValue,
        },
        { onConflict: 'habit_id,log_date', ignoreDuplicates: false },
      )
      if (error) throw error
      return { newOutcome }
    },

    onMutate: async ({ habit_id, log_date, currentOutcome }) => {
      setSyncState({ status: 'syncing', pendingCount: 1, lastSynced: null })
      await queryClient.cancelQueries({ queryKey: queryKeys.allLogsForDate(log_date) })

      const newOutcome = currentOutcome === 'completed' ? null : 'completed'
      const snapshot = queryClient.getQueryData<HabitLog[]>(queryKeys.allLogsForDate(log_date))

      queryClient.setQueryData<HabitLog[]>(queryKeys.allLogsForDate(log_date), (old) => {
        const updated = old ?? []
        const idx = updated.findIndex(l => l.habit_id === habit_id)
        if (idx === -1) {
          return [...updated, {
            id: crypto.randomUUID(),
            habit_id,
            user_id: '',
            log_date,
            total_value: newOutcome === 'completed' ? 1 : 0,
            outcome: newOutcome as HabitLog['outcome'],
            note: null,
            skip_reason: null,
            skipped_at: null,
            is_excused: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]
        }
        return updated.map((l, i) =>
          i === idx
            ? { ...l, outcome: newOutcome as HabitLog['outcome'], total_value: newOutcome === 'completed' ? 1 : 0 }
            : l,
        )
      })

      return { snapshot, newOutcome }
    },

    onSuccess: async (_r, { log_date }) => {
      setSyncState({ status: 'saved', pendingCount: 0, lastSynced: Date.now() })
      queryClient.invalidateQueries({ queryKey: queryKeys.allLogsForDate(log_date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.streaks() })

      // Fire-and-forget achievement check
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { count } = await supabase
          .from('habit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('outcome', 'completed')
        checkAndAwardAchievements({
          userId: user.id,
          maxStreak: 0,
          totalCompleted: count ?? 0,
        }).catch(() => {})
      }
    },

    onError: async (err, { habit_id, log_date, currentOutcome }, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(queryKeys.allLogsForDate(log_date), ctx.snapshot)
      }

      if (!navigator.onLine) {
        const newOutcome = currentOutcome === 'completed' ? null : 'completed'
        await enqueueMutation({
          id: crypto.randomUUID(),
          type: 'update_log',
          payload: {
            habit_id,
            log_date,
            outcome: newOutcome,
            total_value: newOutcome === 'completed' ? 1 : 0,
          },
          createdAt: Date.now(),
        })
        setSyncState({ status: 'offline', pendingCount: 1, lastSynced: null })
        toast.info('Offline — change saved locally.')
        return
      }

      setSyncState({ status: 'failed', pendingCount: 1, lastSynced: null })
      queryClient.invalidateQueries({ queryKey: queryKeys.allLogsForDate(log_date) })
      toast.error('Failed to save. Check your connection.')
    },
  })
}
