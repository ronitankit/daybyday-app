'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useHabits } from '@/features/habits/useHabits'
import { useLogsForDate } from '@/features/tracking/useTracking'
import { HabitCard } from '@/features/tracking/HabitCard'
import { DailySummaryBar } from '@/features/tracking/DailySummaryBar'
import { WeeklyProgress } from '@/features/tracking/WeeklyProgress'
import { InsightBanner } from '@/features/insights/InsightBanner'
import { SyncIndicator } from '@/features/sync/SyncIndicator'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { todayString } from '@/lib/utils/date'
import { isHabitScheduledOnDate } from '@/domain/streaks/streak-engine'
import type { HabitLog } from '@/types'

export function TodayView() {
  const today = useMemo(() => new Date(), [])
  const todayStr = todayString()

  const { data: habits, isLoading: habitsLoading } = useHabits()
  const { data: logs, isLoading: logsLoading } = useLogsForDate(todayStr)

  const isLoading = habitsLoading || logsLoading

  // Filter to habits scheduled today
  const todayHabits = useMemo(() => {
    if (!habits) return []
    return habits.filter((h) => {
      const schedule = h.schedule?.[0]
      if (!schedule) return false
      return isHabitScheduledOnDate(h, schedule, today)
    })
  }, [habits, today])

  // Group by routine
  const grouped = useMemo(() => {
    const withRoutine: Record<string, typeof todayHabits> = {}
    const withoutRoutine: typeof todayHabits = []

    for (const habit of todayHabits) {
      if (habit.routine_id && habit.routine) {
        const key = habit.routine_id
        if (!withRoutine[key]) withRoutine[key] = []
        withRoutine[key].push(habit)
      } else {
        withoutRoutine.push(habit)
      }
    }
    return { withRoutine, withoutRoutine }
  }, [todayHabits])

  const logMap = useMemo(() => {
    const m = new Map<string, HabitLog>()
    if (logs) logs.forEach((l: HabitLog) => m.set(l.habit_id, l))
    return m
  }, [logs])

  const greeting = useMemo(() => {
    const hour = today.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [today])

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {format(today, 'EEEE, MMMM d')}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SyncIndicator />
          <Button asChild size="icon-sm" aria-label="Add habit">
            <Link href="/habits/new">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Daily summary */}
      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : (
        <DailySummaryBar
          habits={todayHabits}
          logs={logs ?? []}
          date={today}
        />
      )}

      {/* Habit list */}
      <section aria-label="Today's habits">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : todayHabits.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {/* Habits in routines */}
            {Object.entries(grouped.withRoutine).map(([routineId, routineHabits]) => {
              const routine = routineHabits[0].routine
              return (
                <div key={routineId}>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {routine?.name ?? 'Routine'}
                  </h2>
                  <div className="space-y-2">
                    {routineHabits.map(habit => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        schedule={habit.schedule?.[0]}
                        log={logMap.get(habit.id) ?? null}
                        date={todayStr}
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Habits without routines */}
            {grouped.withoutRoutine.length > 0 && (
              <div>
                {Object.keys(grouped.withRoutine).length > 0 && (
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Other Habits
                  </h2>
                )}
                <div className="space-y-2">
                  {grouped.withoutRoutine.map(habit => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      schedule={habit.schedule?.[0]}
                      log={logMap.get(habit.id) ?? null}
                      date={todayStr}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Weekly progress */}
      {!isLoading && habits && habits.length > 0 && (
        <WeeklyProgress habits={habits} today={today} />
      )}

      {/* Insight banner */}
      {!isLoading && habits && habits.length > 0 && (
        <InsightBanner habits={habits} today={today} />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-16 px-8 text-center">
      <p className="text-lg font-medium">No habits scheduled today</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Add a habit to start building your day.
      </p>
      <Button asChild className="mt-6">
        <Link href="/habits/new">
          <Plus className="h-4 w-4" />
          Add your first habit
        </Link>
      </Button>
    </div>
  )
}
