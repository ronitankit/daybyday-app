'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useArchiveHabit } from './useHabits'
import { ArrowLeft, Trash2 } from 'lucide-react'
import type { Habit, HabitSchedule } from '@/types'

interface EditHabitViewProps {
  habitId: string
}

export function EditHabitView({ habitId }: EditHabitViewProps) {
  const router = useRouter()
  const archiveHabit = useArchiveHabit()

  const { data: habit, isLoading } = useQuery({
    queryKey: queryKeys.habitWithSchedule(habitId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('habits')
        .select('*, schedule:habit_schedules(*), quick_increments:habit_quick_increments(*)')
        .eq('id', habitId)
        .single()
      if (error) throw error
      return data as Habit & { schedule: HabitSchedule[] }
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!habit) {
    return (
      <div className="text-center py-16">
        <p className="font-medium">Habit not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/habits')}>
          Back to habits
        </Button>
      </div>
    )
  }

  const handleArchive = async () => {
    if (confirm(`Archive "${habit.name}"? You can find it later in the archived view.`)) {
      await archiveHabit.mutateAsync(habit.id)
      router.push('/habits')
    }
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold truncate">{habit.name}</h1>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: habit.colour }} aria-hidden="true" />
          <div>
            <p className="font-semibold">{habit.name}</p>
            <p className="text-sm text-muted-foreground capitalize">{habit.habit_type}</p>
          </div>
        </div>
        {habit.description && (
          <p className="text-sm text-muted-foreground">{habit.description}</p>
        )}
        {habit.target_value && (
          <p className="text-sm">
            Target: <span className="font-medium">{habit.target_value} {habit.unit ?? ''}</span>
          </p>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
        <h2 className="text-sm font-semibold text-destructive mb-3">Danger Zone</h2>
        <Button
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleArchive}
          disabled={archiveHabit.isPending}
        >
          <Trash2 className="h-4 w-4" />
          Archive habit
        </Button>
      </div>
    </div>
  )
}
