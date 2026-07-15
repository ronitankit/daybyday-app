/**
 * DayByDay Streak Engine
 *
 * Centralized, pure, testable streak calculation.
 * No React dependencies. No side effects.
 *
 * Consistency Score Formula:
 *   score = (completedOpportunities + 0.5 * excusedSkips) / scheduledOpportunities * 100
 *
 * - Excused skips count as 0.5 (they don't harm, but don't help)
 * - Normal skips count as 0 (like a miss for consistency)
 * - Score is clamped to 0–100
 */

import {
  parseISO,
  addDays,
  isBefore,
  isAfter,
  startOfDay,
  startOfWeek,
  endOfWeek,
  isSameDay,
  differenceInDays,
  getISODay,
} from 'date-fns'
import { toDateString, getWeekDates } from '@/lib/utils/date'
import type {
  Habit,
  HabitSchedule,
  HabitLog,
  OutcomeState,
  StreakData,
  ConsistencyScore,
  DailyStats,
} from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Schedule helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines if a habit is scheduled on a specific date.
 * Uses the schedule effective on that date.
 */
export function isHabitScheduledOnDate(
  habit: Habit,
  schedule: HabitSchedule,
  date: Date,
): boolean {
  // Outside habit active range
  if (isBefore(date, parseISO(habit.start_date))) return false
  if (habit.end_date && isAfter(date, parseISO(habit.end_date))) return false

  // Paused habits are not scheduled
  if (habit.status === 'paused' || habit.status === 'archived') return false

  switch (schedule.schedule_type) {
    case 'daily':
      return true

    case 'weekdays': {
      if (!schedule.weekdays) return false
      const isoDay = getISODay(date) // 1=Mon...7=Sun
      return schedule.weekdays.includes(isoDay)
    }

    case 'weekly_frequency':
    case 'weekly_cumulative':
      // Every day is "potentially" schedulable — completion is evaluated per-week
      return true

    default:
      return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Outcome helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isSuccessfulOutcome(outcome: OutcomeState | null): boolean {
  return outcome === 'completed'
}

export function isExcusedOutcome(outcome: OutcomeState | null): boolean {
  return outcome === 'excused_skip'
}

export function countStreakBreaker(outcome: OutcomeState | null): boolean {
  return outcome === 'missed' || outcome === 'skipped'
}

// ─────────────────────────────────────────────────────────────────────────────
// Current date for streak computation (injectable for testing)
// ─────────────────────────────────────────────────────────────────────────────

type LogMap = Map<string, HabitLog> // date -> log

// ─────────────────────────────────────────────────────────────────────────────
// Main streak calculation
// ─────────────────────────────────────────────────────────────────────────────

export interface StreakOptions {
  habit: Habit
  schedule: HabitSchedule
  logs: HabitLog[]
  today?: Date
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
}

export function calculateStreak(opts: StreakOptions): StreakData {
  const { habit, schedule, logs, weekStartsOn = 1 } = opts
  const today = opts.today ?? new Date()

  const logMap: LogMap = new Map()
  for (const log of logs) {
    logMap.set(log.log_date, log)
  }

  if (schedule.schedule_type === 'weekly_frequency' || schedule.schedule_type === 'weekly_cumulative') {
    return calculateWeeklyStreak({ habit, schedule, logMap, today, weekStartsOn })
  }

  return calculateDailyStreak({ habit, schedule, logMap, today })
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily / weekday streak
// ─────────────────────────────────────────────────────────────────────────────

function calculateDailyStreak({
  habit,
  schedule,
  logMap,
  today,
}: {
  habit: Habit
  schedule: HabitSchedule
  logMap: LogMap
  today: Date
}): StreakData {
  const habitStart = parseISO(habit.start_date)
  let currentStreak = 0
  let longestStreak = 0
  let lastCompletedDate: string | null = null
  let inCurrentStreak = true
  let runningStreak = 0 // tracks any group (including historical)

  // Walk backwards from today
  let cursor = startOfDay(today)
  const maxDays = differenceInDays(today, habitStart) + 1

  for (let i = 0; i < maxDays; i++) {
    const dateStr = toDateString(cursor)
    const scheduled = isHabitScheduledOnDate(habit, schedule, cursor)

    if (!scheduled) {
      // Unscheduled day — skip without breaking streak
      cursor = addDays(cursor, -1)
      continue
    }

    const log = logMap.get(dateStr)
    const outcome = log?.outcome ?? null

    if (isSuccessfulOutcome(outcome) || isExcusedOutcome(outcome)) {
      if (lastCompletedDate === null && isSuccessfulOutcome(outcome)) {
        lastCompletedDate = dateStr
      }
      runningStreak++
      if (inCurrentStreak) currentStreak = runningStreak
      longestStreak = Math.max(longestStreak, runningStreak)
    } else if (countStreakBreaker(outcome) || (outcome === null && !isSameDay(cursor, today))) {
      // A clear miss or past day with no log — break current group
      if (inCurrentStreak) {
        inCurrentStreak = false
      }
      longestStreak = Math.max(longestStreak, runningStreak)
      runningStreak = 0
    }
    // Today with no log yet — still ongoing, don't break

    cursor = addDays(cursor, -1)
  }

  longestStreak = Math.max(longestStreak, runningStreak)

  return { currentStreak, longestStreak, lastCompletedDate }
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly streak (frequency/cumulative)
// ─────────────────────────────────────────────────────────────────────────────

function calculateWeeklyStreak({
  habit,
  schedule,
  logMap,
  today,
  weekStartsOn,
}: {
  habit: Habit
  schedule: HabitSchedule
  logMap: LogMap
  today: Date
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
}): StreakData {
  const habitStart = parseISO(habit.start_date)
  let currentStreak = 0
  let longestStreak = 0
  let lastCompletedDate: string | null = null
  let inCurrentStreak = true

  // Build list of weeks from habit start to today
  const weeks: { start: Date; end: Date }[] = []
  let weekCursor = startOfWeek(today, { weekStartsOn })
  while (!isBefore(weekCursor, startOfWeek(habitStart, { weekStartsOn }))) {
    weeks.push({
      start: weekCursor,
      end: endOfWeek(weekCursor, { weekStartsOn }),
    })
    weekCursor = addDays(weekCursor, -7)
  }

  for (const week of weeks) {
    const weekDates = getWeekDates(week.start, weekStartsOn)
    const isCurrentWeek = isSameDay(week.start, startOfWeek(today, { weekStartsOn }))

    let weekCompleted = false

    if (schedule.schedule_type === 'weekly_frequency') {
      const target = schedule.frequency_target ?? 1
      let completions = 0
      for (const d of weekDates) {
        const log = logMap.get(toDateString(d))
        if (log && isSuccessfulOutcome(log.outcome)) completions++
      }
      weekCompleted = completions >= target
    } else {
      // weekly_cumulative
      const target = schedule.cumulative_target ?? 1
      let total = 0
      for (const d of weekDates) {
        const log = logMap.get(toDateString(d))
        if (log) total += log.total_value
      }
      weekCompleted = total >= target
    }

    if (weekCompleted) {
      if (lastCompletedDate === null) {
        // Find the last completed day in this week
        const lastInWeek = weekDates
          .filter(d => {
            const log = logMap.get(toDateString(d))
            return log && isSuccessfulOutcome(log.outcome)
          })
          .pop()
        if (lastInWeek) lastCompletedDate = toDateString(lastInWeek)
      }
      if (inCurrentStreak) currentStreak++
    } else if (!isCurrentWeek) {
      // Past week that didn't meet target
      if (inCurrentStreak) {
        inCurrentStreak = false
        longestStreak = Math.max(longestStreak, currentStreak)
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak)
  }

  return { currentStreak, longestStreak, lastCompletedDate }
}

// ─────────────────────────────────────────────────────────────────────────────
// Consistency score
// ─────────────────────────────────────────────────────────────────────────────

export interface ConsistencyScoreOptions {
  habit: Habit
  schedule: HabitSchedule
  logs: HabitLog[]
  fromDate: Date
  toDate: Date
}

export function calculateConsistencyScore(opts: ConsistencyScoreOptions): ConsistencyScore {
  const { habit, schedule, logs, fromDate, toDate } = opts

  const logMap: LogMap = new Map()
  for (const log of logs) logMap.set(log.log_date, log)

  let scheduledOpportunities = 0
  let completedOpportunities = 0
  let excusedSkips = 0

  let cursor = fromDate
  while (!isAfter(cursor, toDate)) {
    if (isHabitScheduledOnDate(habit, schedule, cursor)) {
      scheduledOpportunities++
      const log = logMap.get(toDateString(cursor))
      const outcome = log?.outcome ?? null
      if (isSuccessfulOutcome(outcome)) completedOpportunities++
      else if (isExcusedOutcome(outcome)) excusedSkips++
    }
    cursor = addDays(cursor, 1)
  }

  if (scheduledOpportunities === 0) {
    return { score: 0, label: 'No data', scheduledOpportunities, completedOpportunities, excusedSkips }
  }

  const raw = (completedOpportunities + 0.5 * excusedSkips) / scheduledOpportunities
  const score = Math.round(Math.min(100, Math.max(0, raw * 100)))

  let label = 'Getting started'
  if (score >= 90) label = 'Excellent'
  else if (score >= 75) label = 'Strong'
  else if (score >= 60) label = 'Good'
  else if (score >= 40) label = 'Building'
  else if (score >= 20) label = 'Starting out'

  return { score, label, scheduledOpportunities, completedOpportunities, excusedSkips }
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily stats
// ─────────────────────────────────────────────────────────────────────────────

export function calculateDailyStats(
  habits: Array<{ habit: Habit; schedule: HabitSchedule; log: HabitLog | null }>,
  date: Date,
): DailyStats {
  const dateStr = toDateString(date)
  let scheduledCount = 0
  let completedCount = 0
  let partialCount = 0
  let missedCount = 0
  let skippedCount = 0

  for (const { habit, schedule, log } of habits) {
    if (!isHabitScheduledOnDate(habit, schedule, date)) continue
    scheduledCount++

    const outcome = log?.outcome ?? null
    if (outcome === 'completed') completedCount++
    else if (outcome === 'partial') partialCount++
    else if (outcome === 'missed') missedCount++
    else if (outcome === 'skipped' || outcome === 'excused_skip') skippedCount++
  }

  const completionRate =
    scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0

  return {
    date: dateStr,
    scheduledCount,
    completedCount,
    partialCount,
    missedCount,
    skippedCount,
    completionRate,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Outcome derivation
// ─────────────────────────────────────────────────────────────────────────────

export function deriveOutcome(
  habit: Habit,
  totalValue: number,
  isSkipped: boolean,
  isExcused: boolean,
  isScheduled: boolean,
  isToday: boolean,
): OutcomeState | null {
  if (!isScheduled) return null

  if (isSkipped) return isExcused ? 'excused_skip' : 'skipped'

  if (habit.habit_type === 'binary') {
    if (totalValue >= 1) return 'completed'
    if (!isToday) return 'missed'
    return null
  }

  const target = habit.target_value
  if (target === null) return totalValue > 0 ? 'completed' : null

  if (habit.success_direction === 'decrease' || habit.success_direction === 'zero') {
    // Limit habit: success = at or below target
    if (totalValue === 0 && habit.success_direction === 'zero') return 'completed'
    if (totalValue <= target) return 'completed'
    if (totalValue > target) return 'missed'
    return null
  }

  // increase direction
  if (totalValue >= target) return 'completed'
  if (totalValue > 0) return 'partial'
  if (!isToday) return 'missed'
  return null
}
