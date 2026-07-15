/**
 * DayByDay Insight Engine
 *
 * Deterministic, data-driven insights. No AI calls.
 * Interface is designed to be replaced with an AI provider later.
 */

import type { Habit, HabitLog, InsightMessage, HabitSchedule } from '@/types'
import { isHabitScheduledOnDate } from '@/domain/streaks/streak-engine'
import { toDateString, addDays } from '@/lib/utils/date'
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns'

export interface InsightContext {
  habits: Array<{ habit: Habit; schedule: HabitSchedule; logs: HabitLog[] }>
  today: Date
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function generateInsights(ctx: InsightContext): InsightMessage[] {
  const insights: InsightMessage[] = []
  const { habits, today, weekStartsOn = 1 } = ctx

  if (habits.length === 0) return []

  // ── Weekly completion rate ─────────────────────────────────────────────────
  const thisWeekStart = startOfWeek(today, { weekStartsOn })
  const lastWeekStart = subWeeks(thisWeekStart, 1)
  const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn })

  const weekStats = computeWeekStats(habits, thisWeekStart, today)
  const lastWeekStats = computeWeekStats(habits, lastWeekStart, lastWeekEnd)

  if (weekStats.scheduled > 0) {
    const pct = Math.round((weekStats.completed / weekStats.scheduled) * 100)
    insights.push({
      id: 'weekly_completion',
      message: `You completed ${pct}% of your scheduled habits this week.`,
      type: pct >= 80 ? 'positive' : pct >= 50 ? 'neutral' : 'actionable',
      priority: 10,
    })
  }

  // ── Week-over-week comparison ─────────────────────────────────────────────
  if (weekStats.scheduled > 0 && lastWeekStats.scheduled > 0) {
    const thisRate = weekStats.completed / weekStats.scheduled
    const lastRate = lastWeekStats.completed / lastWeekStats.scheduled
    const diff = Math.round((thisRate - lastRate) * 100)
    if (Math.abs(diff) >= 5) {
      insights.push({
        id: 'week_comparison',
        message:
          diff > 0
            ? `Your consistency improved by ${diff}% compared with last week.`
            : `Your consistency dropped by ${Math.abs(diff)}% compared with last week.`,
        type: diff > 0 ? 'positive' : 'actionable',
        priority: 8,
      })
    }
  }

  // ── Strongest / weakest habit ─────────────────────────────────────────────
  const habitRates = habits.map(({ habit, schedule, logs }) => {
    const rate = computeHabitCompletionRate(habit, schedule, logs, lastWeekStart, today)
    return { habit, rate }
  }).filter(h => h.rate !== null) as Array<{ habit: Habit; rate: number }>

  if (habitRates.length >= 2) {
    const sorted = [...habitRates].sort((a, b) => b.rate - a.rate)
    const strongest = sorted[0]
    const weakest = sorted[sorted.length - 1]

    if (strongest.rate >= 80) {
      insights.push({
        id: 'strongest_habit',
        message: `${strongest.habit.name} is currently your strongest habit.`,
        type: 'positive',
        habitId: strongest.habit.id,
        habitName: strongest.habit.name,
        priority: 6,
      })
    }

    if (weakest.rate < 50 && weakest.rate !== strongest.rate) {
      insights.push({
        id: 'weakest_habit',
        message: `${weakest.habit.name} needs more attention — you've completed it ${weakest.rate}% of the time recently.`,
        type: 'actionable',
        habitId: weakest.habit.id,
        habitName: weakest.habit.name,
        priority: 7,
      })
    }
  }

  // ── Best performing weekday ───────────────────────────────────────────────
  const weekdayRates = computeWeekdayRates(habits, today)
  const bestDay = weekdayRates.reduce(
    (best, curr) => (curr.rate > best.rate ? curr : best),
    { day: -1, rate: 0 },
  )
  if (bestDay.rate >= 70 && bestDay.day >= 0) {
    insights.push({
      id: 'best_weekday',
      message: `${WEEKDAY_NAMES[bestDay.day]} is your most consistent day.`,
      type: 'positive',
      priority: 4,
    })
  }

  // ── Partially completed habits ────────────────────────────────────────────
  const partialHabits = habits.filter(({ logs }) => {
    const recent = logs.slice(-14)
    const partials = recent.filter(l => l.outcome === 'partial').length
    return partials >= 3
  })
  if (partialHabits.length > 0) {
    const names = partialHabits.map(h => h.habit.name)
    insights.push({
      id: 'partial_habits',
      message:
        partialHabits.length === 1
          ? `${names[0]} is frequently partially completed — consider adjusting your target.`
          : `${partialHabits.length} habits are frequently partially completed.`,
      type: 'actionable',
      priority: 5,
    })
  }

  // Sort by priority descending and return top insights
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 5)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeWeekStats(
  habits: InsightContext['habits'],
  from: Date,
  to: Date,
): { scheduled: number; completed: number } {
  let scheduled = 0
  let completed = 0

  for (const { habit, schedule, logs } of habits) {
    const logMap = new Map(logs.map(l => [l.log_date, l]))
    let cursor = from
    while (cursor <= to) {
      if (isHabitScheduledOnDate(habit, schedule, cursor)) {
        scheduled++
        const log = logMap.get(toDateString(cursor))
        if (log?.outcome === 'completed') completed++
      }
      cursor = addDays(cursor, 1)
    }
  }

  return { scheduled, completed }
}

function computeHabitCompletionRate(
  habit: Habit,
  schedule: HabitSchedule,
  logs: HabitLog[],
  from: Date,
  to: Date,
): number | null {
  const logMap = new Map(logs.map(l => [l.log_date, l]))
  let scheduled = 0
  let completed = 0

  let cursor = from
  while (cursor <= to) {
    if (isHabitScheduledOnDate(habit, schedule, cursor)) {
      scheduled++
      const log = logMap.get(toDateString(cursor))
      if (log?.outcome === 'completed') completed++
    }
    cursor = addDays(cursor, 1)
  }

  if (scheduled === 0) return null
  return Math.round((completed / scheduled) * 100)
}

function computeWeekdayRates(
  habits: InsightContext['habits'],
  today: Date,
): Array<{ day: number; rate: number }> {
  const dayCounts = Array.from({ length: 7 }, () => ({ scheduled: 0, completed: 0 }))

  for (const { habit, schedule, logs } of habits) {
    const logMap = new Map(logs.map(l => [l.log_date, l]))
    const lookback = 28
    for (let i = 0; i < lookback; i++) {
      const date = addDays(today, -i)
      if (isHabitScheduledOnDate(habit, schedule, date)) {
        const dow = date.getDay() // 0=Sun
        dayCounts[dow].scheduled++
        const log = logMap.get(toDateString(date))
        if (log?.outcome === 'completed') dayCounts[dow].completed++
      }
    }
  }

  return dayCounts.map((c, day) => ({
    day,
    rate: c.scheduled > 0 ? Math.round((c.completed / c.scheduled) * 100) : 0,
  }))
}
