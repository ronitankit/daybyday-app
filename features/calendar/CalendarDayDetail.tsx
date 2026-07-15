'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HabitCard } from '@/features/tracking/HabitCard'
import { useLogsForDate } from '@/features/tracking/useTracking'
import { isHabitScheduledOnDate } from '@/domain/streaks/streak-engine'
import { toDateString } from '@/lib/utils/date'
import type { Habit, HabitSchedule, HabitLog } from '@/types'

interface CalendarDayDetailProps {
  date: Date
  habits: Array<Habit & { schedule?: HabitSchedule[] }>
  onClose: () => void
}

export function CalendarDayDetail({ date, habits, onClose }: CalendarDayDetailProps) {
  const dateStr = toDateString(date)
  const { data: logs } = useLogsForDate(dateStr)

  const scheduledHabits = useMemo(() => {
    return habits.filter(h => {
      const schedule = h.schedule?.[0]
      return schedule && isHabitScheduledOnDate(h, schedule, date)
    })
  }, [habits, date])

  const logMap = useMemo(() => {
    const m = new Map<string, HabitLog>()
    logs?.forEach(l => m.set(l.habit_id, l))
    return m
  }, [logs])

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{format(date, 'EEEE, MMMM d')}</CardTitle>
          <button
            onClick={onClose}
            aria-label="Close day detail"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {scheduledHabits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No habits scheduled on this day.</p>
        ) : (
          <div className="space-y-2">
            {scheduledHabits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                schedule={habit.schedule?.[0]}
                log={logMap.get(habit.id) ?? null}
                date={dateStr}
                isHistorical={true}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
