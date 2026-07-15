'use client'

import { useMemo } from 'react'
import { addDays, startOfWeek, format } from 'date-fns'
import { useLogsForDate } from './useTracking'
import { isHabitScheduledOnDate } from '@/domain/streaks/streak-engine'
import { toDateString } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import type { Habit, HabitSchedule, HabitLog } from '@/types'

interface WeeklyProgressProps {
  habits: Array<Habit & { schedule?: HabitSchedule[] }>
  today: Date
}

export function WeeklyProgress({ habits, today }: WeeklyProgressProps) {
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <section aria-label="Weekly progress">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">This Week</h2>
      <div className="flex gap-1.5">
        {weekDates.map((date) => (
          <WeekDay
            key={toDateString(date)}
            date={date}
            habits={habits}
            isToday={toDateString(date) === toDateString(today)}
          />
        ))}
      </div>
    </section>
  )
}

function WeekDay({
  date,
  habits,
  isToday,
}: {
  date: Date
  habits: Array<Habit & { schedule?: HabitSchedule[] }>
  isToday: boolean
}) {
  const dateStr = toDateString(date)
  const isPast = date < new Date() || isToday

  const { data: logs } = useLogsForDate(dateStr)

  const { completionRate, scheduledCount } = useMemo(() => {
    if (!isPast) return { completionRate: 0, scheduledCount: 0 }

    const scheduled = habits.filter(h => {
      const schedule = h.schedule?.[0]
      return schedule && isHabitScheduledOnDate(h, schedule, date)
    })

    if (scheduled.length === 0) return { completionRate: 0, scheduledCount: 0 }

    const logMap = new Map<string, HabitLog>()
    logs?.forEach(l => logMap.set(l.habit_id, l))

    const completed = scheduled.filter(h => logMap.get(h.id)?.outcome === 'completed').length
    return {
      completionRate: Math.round((completed / scheduled.length) * 100),
      scheduledCount: scheduled.length,
    }
  }, [habits, logs, date, isPast])

  const bgClass = !isPast || scheduledCount === 0
    ? 'bg-muted/50'
    : completionRate === 100
    ? 'bg-green-500'
    : completionRate >= 50
    ? 'bg-primary'
    : completionRate > 0
    ? 'bg-primary/40'
    : 'bg-red-400/60'

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div
        className={cn(
          'h-8 w-full rounded-md transition-colors',
          bgClass,
          isToday && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        )}
        role="status"
        aria-label={`${format(date, 'EEEE')}: ${scheduledCount > 0 ? `${completionRate}% complete` : 'no habits'}`}
      />
      <span className={cn(
        'text-[10px] font-medium',
        isToday ? 'text-primary' : 'text-muted-foreground',
      )}>
        {format(date, 'EEE')[0]}
      </span>
    </div>
  )
}
