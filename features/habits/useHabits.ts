'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Habit, HabitSchedule, CreateHabitInput } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Fetch all habits with schedules and categories
// ─────────────────────────────────────────────────────────────────────────────

async function fetchHabits() {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('habits')
    .select(`
      *,
      category:categories(id, name, colour, icon),
      routine:routines(id, name, colour),
      schedule:habit_schedules(*)
    `)
    .neq('status', 'archived')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data as Array<Habit & { schedule: HabitSchedule[] }>
}

export function useHabits() {
  return useQuery({
    queryKey: queryKeys.habits(),
    queryFn: fetchHabits,
    staleTime: 30 * 1000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch archived habits
// ─────────────────────────────────────────────────────────────────────────────

async function fetchArchivedHabits() {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('habits')
    .select(`
      *,
      category:categories(id, name, colour, icon),
      routine:routines(id, name, colour),
      schedule:habit_schedules(*)
    `)
    .eq('status', 'archived')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data as Array<Habit & { schedule: HabitSchedule[] }>
}

export function useArchivedHabits() {
  return useQuery({
    queryKey: queryKeys.archivedHabits(),
    queryFn: fetchArchivedHabits,
    staleTime: 30 * 1000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Create habit
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateHabit() {
  const queryClient = useQueryClient()
  const supabase = getSupabaseBrowserClient()

  return useMutation({
    mutationFn: async (input: CreateHabitInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const habitId = crypto.randomUUID()

      const { error: habitError } = await supabase.from('habits').insert({
        id: habitId,
        user_id: user.id,
        name: input.name,
        description: input.description,
        habit_type: input.habit_type,
        target_value: input.target_value,
        unit: input.unit,
        success_direction: input.success_direction,
        category_id: input.category_id,
        routine_id: input.routine_id,
        colour: input.colour,
        icon: input.icon,
        start_date: input.start_date,
        end_date: input.end_date,
        notes: input.notes,
      })
      if (habitError) throw habitError

      const { error: scheduleError } = await supabase.from('habit_schedules').insert({
        id: crypto.randomUUID(),
        habit_id: habitId,
        user_id: user.id,
        schedule_type: input.schedule.schedule_type,
        weekdays: input.schedule.weekdays,
        frequency_target: input.schedule.frequency_target,
        cumulative_target: input.schedule.cumulative_target,
        effective_from: input.start_date,
      })
      if (scheduleError) throw scheduleError

      if (input.quick_increments?.length) {
        await supabase.from('habit_quick_increments').insert(
          input.quick_increments.map((qi) => ({
            id: crypto.randomUUID(),
            habit_id: habitId,
            user_id: user.id,
            value: qi.value,
            label: qi.label,
            sort_order: qi.sort_order,
          })),
        )
      }

      return habitId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.habits() })
      toast.success('Habit created')
    },
    onError: (err) => {
      toast.error(`Failed to create habit: ${err.message}`)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Update habit
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateHabit() {
  const queryClient = useQueryClient()
  const supabase = getSupabaseBrowserClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Habit> & { id: string }) => {
      const { error } = await supabase
        .from('habits')
        .update(updates)
        .eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.habits() })
      queryClient.invalidateQueries({ queryKey: queryKeys.habit(id) })
    },
    onError: (err) => {
      toast.error(`Failed to update habit: ${err.message}`)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete / archive habit
// ─────────────────────────────────────────────────────────────────────────────

export function useArchiveHabit() {
  const queryClient = useQueryClient()
  const supabase = getSupabaseBrowserClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('habits')
        .update({ status: 'archived' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.habits() })
      queryClient.invalidateQueries({ queryKey: queryKeys.archivedHabits() })
      toast.success('Habit archived')
    },
  })
}

export function useUnarchiveHabit() {
  const queryClient = useQueryClient()
  const supabase = getSupabaseBrowserClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('habits')
        .update({ status: 'active' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.habits() })
      queryClient.invalidateQueries({ queryKey: queryKeys.archivedHabits() })
      toast.success('Habit unarchived')
    },
    onError: (err) => {
      toast.error(`Failed to unarchive habit: ${err.message}`)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Reorder habits (drag-and-drop)
// ─────────────────────────────────────────────────────────────────────────────

export function useReorderHabits() {
  const queryClient = useQueryClient()
  const supabase = getSupabaseBrowserClient()

  return useMutation({
    mutationFn: async (updates: Array<{ id: string; sort_order: number }>) => {
      const promises = updates.map(({ id, sort_order }) =>
        supabase.from('habits').update({ sort_order }).eq('id', id),
      )
      await Promise.all(promises)
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.habits() })
      const previous = queryClient.getQueryData(queryKeys.habits())
      queryClient.setQueryData(queryKeys.habits(), (old: Habit[] | undefined) => {
        if (!old) return old
        const orderMap = new Map(updates.map(u => [u.id, u.sort_order]))
        return [...old].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
      })
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKeys.habits(), ctx.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.habits() })
    },
  })
}
