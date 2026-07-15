'use client'

import { useMemo, lazy, Suspense } from 'react'
import { subDays } from 'date-fns'
import { useHabits } from '@/features/habits/useHabits'
import { useHabitLogs } from '@/features/tracking/useTracking'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateStreak, calculateConsistencyScore } from '@/domain/streaks/streak-engine'
import { generateInsights } from '@/domain/insights/insight-engine'
import { toDateString, todayString } from '@/lib/utils/date'
import { Flame, Trophy } from 'lucide-react'
import type { Habit, HabitSchedule } from '@/types'

const CompletionTrendChart = lazy(() =>
  import('./CompletionTrendChart').then(m => ({ default: m.CompletionTrendChart }))
)

export function AnalyticsView() {
  const today = useMemo(() => new Date(), [])
  const todayStr = todayString()
  const thirtyDaysAgo = toDateString(subDays(today, 30))

  const { data: habits, isLoading: habitsLoading } = useHabits()

  // Summary metrics using per-habit log fetching
  const isLoading = habitsLoading

  const summaryMetrics = useMemo(() => {
    if (!habits) return null

    let totalCurrentStreak = 0
    let longestStreak = 0

    for (const habit of habits as Array<Habit & { schedule?: HabitSchedule[] }>) {
      const schedule = habit.schedule?.[0]
      if (!schedule) continue
      const streak = calculateStreak({ habit, schedule, logs: [], today })
      totalCurrentStreak = Math.max(totalCurrentStreak, streak.currentStreak)
      longestStreak = Math.max(longestStreak, streak.longestStreak)
    }

    return { totalCurrentStreak, longestStreak }
  }, [habits, today])

  const insights = useMemo(() => {
    if (!habits) return []
    return generateInsights({
      habits: (habits as Array<Habit & { schedule?: HabitSchedule[] }>)
        .filter((h) => h.schedule?.[0])
        .map((h) => ({
          habit: h,
          schedule: h.schedule![0],
          logs: [],
        })),
      today,
      weekStartsOn: 1,
    })
  }, [habits, today])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Best streak"
          value={summaryMetrics?.longestStreak ?? 0}
          unit="days"
          icon={<Trophy className="h-5 w-5 text-yellow-500" />}
          loading={isLoading}
        />
        <MetricCard
          label="Current streak"
          value={summaryMetrics?.totalCurrentStreak ?? 0}
          unit="days"
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          loading={isLoading}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="trends">
        <TabsList className="w-full">
          <TabsTrigger value="trends" className="flex-1">Trends</TabsTrigger>
          <TabsTrigger value="habits" className="flex-1">By Habit</TabsTrigger>
          <TabsTrigger value="insights" className="flex-1">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-4 space-y-4">
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
            {habits && (
              <CompletionTrendChart
                habits={habits}
                from={thirtyDaysAgo}
                to={todayStr}
              />
            )}
          </Suspense>
        </TabsContent>

        <TabsContent value="habits" className="mt-4 space-y-4">
          {(habits as Array<Habit & { schedule?: HabitSchedule[] }> | undefined)?.map(habit => (
            <HabitStatCard key={habit.id} habit={habit} />
          ))}
        </TabsContent>

        <TabsContent value="insights" className="mt-4 space-y-3">
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Track more habits to see insights.
            </p>
          ) : (
            insights.map(insight => (
              <Card key={insight.id}>
                <CardContent className="p-4">
                  <p className="text-sm">{insight.message}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  loading,
}: {
  label: string
  value: number
  unit: string
  icon: React.ReactNode
  loading: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4">
        {loading ? (
          <Skeleton className="h-14 w-full" />
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold tabular-nums mt-1">
                {value}
                <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
              </p>
            </div>
            <div aria-hidden="true">{icon}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function HabitStatCard({ habit }: { habit: Habit & { schedule?: HabitSchedule[] } }) {
  const today = useMemo(() => new Date(), [])
  const from = toDateString(subDays(today, 30))
  const to = todayString()

  const { data: logs } = useHabitLogs(habit.id, from, to)
  const schedule = habit.schedule?.[0]

  const stats = useMemo(() => {
    if (!schedule || !logs) return null
    const streak = calculateStreak({ habit, schedule, logs, today })
    const consistency = calculateConsistencyScore({ habit, schedule, logs, fromDate: subDays(today, 30), toDate: today })
    return { streak, consistency }
  }, [habit, schedule, logs, today])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: habit.colour }} aria-hidden="true" />
          <CardTitle className="text-sm font-medium">{habit.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!stats ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Streak</p>
              <p className="text-xl font-bold tabular-nums">{stats.streak.currentStreak}<span className="text-sm font-normal text-muted-foreground">d</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Consistency</p>
              <p className="text-xl font-bold tabular-nums">{stats.consistency.score}<span className="text-sm font-normal text-muted-foreground">%</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Best streak</p>
              <p className="text-xl font-bold tabular-nums">{stats.streak.longestStreak}<span className="text-sm font-normal text-muted-foreground">d</span></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
