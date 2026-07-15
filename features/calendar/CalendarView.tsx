'use client'

import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isAfter,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHabits } from '@/features/habits/useHabits'
import { useLogsForDate } from '@/features/tracking/useTracking'
import { isHabitScheduledOnDate } from '@/domain/streaks/streak-engine'
import { toDateString } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import { CalendarDayDetail } from './CalendarDayDetail'
import type { HabitLog, Habit, HabitSchedule } from '@/types'

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const { data: habits } = useHabits()
  const today = new Date()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const calDays: Date[] = []
  let day = calStart
  while (!isAfter(day, calEnd)) {
    calDays.push(day)
    day = addDays(day, 1)
  }

  const weeks: Date[][] = []
  for (let i = 0; i < calDays.length; i += 7) {
    weeks.push(calDays.slice(i, i + 7))
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {format(currentMonth, 'MMMM yyyy')}
        </h1>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth(new Date())}
            aria-label="Go to today"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Calendar grid */}
      <div role="grid" aria-label="Calendar">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1" role="row">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div
              key={d}
              role="columnheader"
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1 mb-1" role="row">
            {week.map((date) => (
              <CalendarCell
                key={toDateString(date)}
                date={date}
                habits={habits ?? []}
                isCurrentMonth={isSameMonth(date, currentMonth)}
                isToday={isSameDay(date, today)}
                isSelected={selectedDate ? isSameDay(date, selectedDate) : false}
                onSelect={() => setSelectedDate(isSameDay(date, selectedDate ?? new Date(0)) ? null : date)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <CalendarDayDetail
          date={selectedDate}
          habits={habits ?? []}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}

function CalendarCell({
  date,
  habits,
  isCurrentMonth,
  isToday,
  isSelected,
  onSelect,
}: {
  date: Date
  habits: Array<Habit & { schedule?: HabitSchedule[] }>
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  onSelect: () => void
}) {
  const dateStr = toDateString(date)
  const { data: logs } = useLogsForDate(dateStr)
  const isFuture = isAfter(date, new Date())

  const completionData = useMemo(() => {
    const scheduled = habits.filter((h) => {
      const schedule = h.schedule?.[0]
      return schedule && isHabitScheduledOnDate(h, schedule, date)
    })
    if (scheduled.length === 0) return null

    const logMap = new Map((logs ?? []).map((l: HabitLog) => [l.habit_id, l]))
    const completed = scheduled.filter((h) => logMap.get(h.id)?.outcome === 'completed').length
    const partial = scheduled.filter((h) => logMap.get(h.id)?.outcome === 'partial').length

    return {
      rate: Math.round((completed / scheduled.length) * 100),
      completed,
      total: scheduled.length,
      hasPartial: partial > 0,
    }
  }, [habits, logs, date])

  const dotColour = !completionData || isFuture
    ? null
    : completionData.rate === 100
    ? 'bg-green-500'
    : completionData.rate >= 50
    ? 'bg-primary'
    : completionData.hasPartial
    ? 'bg-yellow-500'
    : 'bg-red-400'

  return (
    <button
      role="gridcell"
      onClick={onSelect}
      aria-label={`${format(date, 'MMMM d')}: ${
        !completionData ? 'no habits scheduled'
        : `${completionData.completed}/${completionData.total} habits completed`
      }`}
      aria-selected={isSelected}
      aria-current={isToday ? 'date' : undefined}
      disabled={isFuture}
      className={cn(
        'relative aspect-square flex flex-col items-center justify-center rounded-lg p-1',
        'text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
        isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
        isToday && 'font-bold',
        isSelected && 'bg-primary text-primary-foreground',
        !isSelected && !isFuture && 'hover:bg-accent',
        isFuture && 'opacity-40 cursor-default',
      )}
    >
      <span className="text-xs">{format(date, 'd')}</span>
      {dotColour && !isSelected && (
        <div className={cn('mt-0.5 h-1 w-1 rounded-full', dotColour)} aria-hidden="true" />
      )}
    </button>
  )
}
