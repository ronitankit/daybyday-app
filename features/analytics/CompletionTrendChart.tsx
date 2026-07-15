'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { useLogsForDateRange } from '@/features/tracking/useTracking'
import { isHabitScheduledOnDate } from '@/domain/streaks/streak-engine'
import { getDateRange } from '@/lib/utils/date'
import { Skeleton } from '@/components/ui/skeleton'
import type { Habit, HabitSchedule } from '@/types'

interface CompletionTrendChartProps {
  habits: Array<Habit & { schedule?: HabitSchedule[] }>
  from: string
  to: string
}

export function CompletionTrendChart({ habits, from, to }: CompletionTrendChartProps) {
  const { data: logs, isLoading } = useLogsForDateRange(from, to)
  const dates = useMemo(() => getDateRange(from, to), [from, to])

  const chartData = useMemo(() => {
    const completedByDate = new Map<string, Set<string>>()
    for (const log of logs ?? []) {
      if (log.outcome === 'completed') {
        if (!completedByDate.has(log.log_date)) completedByDate.set(log.log_date, new Set())
        completedByDate.get(log.log_date)!.add(log.habit_id)
      }
    }

    return dates.map(d => {
      const date = parseISO(d)
      const scheduled = habits.filter(h => {
        const schedule = h.schedule?.[0]
        return schedule && isHabitScheduledOnDate(h, schedule, date)
      })
      if (scheduled.length === 0) return { date: d, completion: null as number | null }

      const completedSet = completedByDate.get(d) ?? new Set<string>()
      const completed = scheduled.filter(h => completedSet.has(h.id)).length
      return { date: d, completion: Math.round((completed / scheduled.length) * 100) }
    })
  }, [logs, dates, habits])

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />

  return (
    <div>
      <h2 className="text-sm font-semibold mb-4">30-Day Completion Trend</h2>
      <div className="h-48 w-full" role="img" aria-label="30-day completion trend chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              tickFormatter={d => format(parseISO(d), 'd')}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval={6}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => value == null ? ['—', 'No habits'] : [`${Math.round(Number(value))}%`, 'Completion']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) => format(parseISO(String(label)), 'MMM d')}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="completion"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.1)"
              strokeWidth={2}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">
        Chart showing daily habit completion percentage over the selected period.
      </p>
    </div>
  )
}
