'use client'

import { useMemo } from 'react'
import { Flame, CheckCircle2, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { calculateDailyStats } from '@/domain/streaks/streak-engine'
import { cn } from '@/lib/utils/cn'
import type { Habit, HabitLog, HabitSchedule } from '@/types'

interface DailySummaryBarProps {
  habits: Array<Habit & { schedule?: HabitSchedule[] }>
  logs: HabitLog[]
  date: Date
}

export function DailySummaryBar({ habits, logs, date }: DailySummaryBarProps) {
  const logMap = useMemo(() => {
    const m = new Map<string, HabitLog>()
    logs.forEach(l => m.set(l.habit_id, l))
    return m
  }, [logs])

  const stats = useMemo(() => {
    const items = habits.map(h => ({
      habit: h,
      schedule: h.schedule?.[0] ?? null,
      log: logMap.get(h.id) ?? null,
    })).filter(i => i.schedule !== null) as Array<{ habit: Habit; schedule: HabitSchedule; log: HabitLog | null }>

    return calculateDailyStats(items, date)
  }, [habits, logMap, date])

  const { completedCount, scheduledCount, completionRate } = stats

  return (
    <Card className="border-0 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          {/* Completion ring */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                <circle
                  cx="32" cy="32" r="26"
                  fill="none"
                  strokeWidth="6"
                  className="stroke-primary/20"
                />
                <circle
                  cx="32" cy="32" r="26"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="stroke-primary transition-all duration-500"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  strokeDashoffset={`${2 * Math.PI * 26 * (1 - completionRate / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-lg font-bold tabular-nums"
                  aria-label={`${completionRate}% complete`}
                >
                  {completionRate}%
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Today&apos;s progress</p>
              <p className="text-2xl font-bold tabular-nums">
                {completedCount}
                <span className="text-base font-normal text-muted-foreground">
                  /{scheduledCount}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">habits completed</p>
            </div>
          </div>

          {/* Motivational state */}
          <div className="text-right shrink-0">
            {completionRate === 100 && scheduledCount > 0 ? (
              <div className="flex flex-col items-end gap-1">
                <CheckCircle2 className="h-8 w-8 text-green-500" aria-hidden="true" />
                <p className="text-xs font-medium text-green-600 dark:text-green-400">
                  Perfect day!
                </p>
              </div>
            ) : completionRate >= 50 ? (
              <div className="flex flex-col items-end gap-1">
                <TrendingUp className="h-8 w-8 text-primary" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">Keep going</p>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <Flame className="h-8 w-8 text-orange-400" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">
                  {scheduledCount - completedCount} left
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {scheduledCount > 0 && (
          <div className="mt-4">
            <div className="h-1.5 w-full rounded-full bg-primary/20 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  completionRate === 100 ? 'bg-green-500' : 'bg-primary',
                )}
                style={{ width: `${completionRate}%` }}
                role="progressbar"
                aria-valuenow={completionRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Daily completion: ${completionRate}%`}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
