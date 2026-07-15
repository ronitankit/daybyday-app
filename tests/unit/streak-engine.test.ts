import { describe, it, expect } from 'vitest'
import {
  calculateStreak,
  calculateConsistencyScore,
  deriveOutcome,
  isHabitScheduledOnDate,
} from '@/domain/streaks/streak-engine'
import type { Habit, HabitSchedule, HabitLog } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const TODAY = new Date('2024-07-12')

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    user_id: 'user-1',
    name: 'Test Habit',
    description: null,
    habit_type: 'binary',
    target_value: null,
    unit: null,
    success_direction: 'increase',
    category_id: null,
    routine_id: null,
    colour: '#6366f1',
    icon: null,
    start_date: '2024-07-01',
    end_date: null,
    status: 'active',
    sort_order: 0,
    notes: null,
    created_at: '2024-07-01T00:00:00Z',
    updated_at: '2024-07-01T00:00:00Z',
    ...overrides,
  }
}

function makeSchedule(overrides: Partial<HabitSchedule> = {}): HabitSchedule {
  return {
    id: 'schedule-1',
    habit_id: 'habit-1',
    user_id: 'user-1',
    schedule_type: 'daily',
    weekdays: null,
    frequency_target: null,
    cumulative_target: null,
    effective_from: '2024-07-01',
    effective_until: null,
    created_at: '2024-07-01T00:00:00Z',
    updated_at: '2024-07-01T00:00:00Z',
    ...overrides,
  }
}

function makeLog(date: string, outcome: HabitLog['outcome'], value = 1): HabitLog {
  return {
    id: `log-${date}`,
    habit_id: 'habit-1',
    user_id: 'user-1',
    log_date: date,
    outcome,
    total_value: value,
    note: null,
    skip_reason: null,
    skipped_at: null,
    is_excused: outcome === 'excused_skip',
    created_at: `${date}T00:00:00Z`,
    updated_at: `${date}T00:00:00Z`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// isHabitScheduledOnDate
// ─────────────────────────────────────────────────────────────────────────────

describe('isHabitScheduledOnDate', () => {
  it('returns false before habit start date', () => {
    const habit = makeHabit({ start_date: '2024-07-10' })
    const schedule = makeSchedule({ schedule_type: 'daily' })
    expect(isHabitScheduledOnDate(habit, schedule, new Date('2024-07-09'))).toBe(false)
  })

  it('returns true on start date for daily habit', () => {
    const habit = makeHabit({ start_date: '2024-07-10' })
    const schedule = makeSchedule({ schedule_type: 'daily' })
    expect(isHabitScheduledOnDate(habit, schedule, new Date('2024-07-10'))).toBe(true)
  })

  it('returns false after end date', () => {
    const habit = makeHabit({ start_date: '2024-07-01', end_date: '2024-07-10' })
    const schedule = makeSchedule({ schedule_type: 'daily' })
    expect(isHabitScheduledOnDate(habit, schedule, new Date('2024-07-11'))).toBe(false)
  })

  it('returns false for paused habit', () => {
    const habit = makeHabit({ status: 'paused' })
    const schedule = makeSchedule({ schedule_type: 'daily' })
    expect(isHabitScheduledOnDate(habit, schedule, TODAY)).toBe(false)
  })

  it('only schedules correct weekdays for weekday habit', () => {
    const habit = makeHabit()
    // Monday=1, Wednesday=3, Friday=5
    const schedule = makeSchedule({ schedule_type: 'weekdays', weekdays: [1, 3, 5] })
    expect(isHabitScheduledOnDate(habit, schedule, new Date('2024-07-08'))).toBe(true)  // Mon
    expect(isHabitScheduledOnDate(habit, schedule, new Date('2024-07-09'))).toBe(false) // Tue
    expect(isHabitScheduledOnDate(habit, schedule, new Date('2024-07-10'))).toBe(true)  // Wed
    expect(isHabitScheduledOnDate(habit, schedule, new Date('2024-07-11'))).toBe(false) // Thu
    expect(isHabitScheduledOnDate(habit, schedule, new Date('2024-07-12'))).toBe(true)  // Fri
    expect(isHabitScheduledOnDate(habit, schedule, new Date('2024-07-13'))).toBe(false) // Sat
    expect(isHabitScheduledOnDate(habit, schedule, new Date('2024-07-14'))).toBe(false) // Sun
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calculateStreak — daily
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateStreak — daily', () => {
  it('returns 0 streak with no logs', () => {
    const result = calculateStreak({
      habit: makeHabit(),
      schedule: makeSchedule(),
      logs: [],
      today: TODAY,
    })
    expect(result.currentStreak).toBe(0)
    expect(result.longestStreak).toBe(0)
  })

  it('counts consecutive completed days', () => {
    const logs = [
      makeLog('2024-07-10', 'completed'),
      makeLog('2024-07-11', 'completed'),
      makeLog('2024-07-12', 'completed'),
    ]
    const result = calculateStreak({ habit: makeHabit(), schedule: makeSchedule(), logs, today: TODAY })
    expect(result.currentStreak).toBe(3)
  })

  it('resets streak on a missed day', () => {
    const logs = [
      makeLog('2024-07-08', 'completed'),
      makeLog('2024-07-09', 'missed'),
      makeLog('2024-07-10', 'completed'),
      makeLog('2024-07-11', 'completed'),
      makeLog('2024-07-12', 'completed'),
    ]
    const result = calculateStreak({ habit: makeHabit(), schedule: makeSchedule(), logs, today: TODAY })
    expect(result.currentStreak).toBe(3)
    expect(result.longestStreak).toBe(3)
  })

  it('excused skip does not break streak', () => {
    const logs = [
      makeLog('2024-07-10', 'completed'),
      makeLog('2024-07-11', 'excused_skip'),
      makeLog('2024-07-12', 'completed'),
    ]
    const result = calculateStreak({ habit: makeHabit(), schedule: makeSchedule(), logs, today: TODAY })
    expect(result.currentStreak).toBe(3)
  })

  it('regular skip breaks streak', () => {
    const logs = [
      makeLog('2024-07-10', 'completed'),
      makeLog('2024-07-11', 'skipped'),
      makeLog('2024-07-12', 'completed'),
    ]
    const result = calculateStreak({ habit: makeHabit(), schedule: makeSchedule(), logs, today: TODAY })
    expect(result.currentStreak).toBe(1)
  })

  it('unscheduled days for weekday habit do not break streak', () => {
    // Mon-Fri only
    const schedule = makeSchedule({ schedule_type: 'weekdays', weekdays: [1, 2, 3, 4, 5] })
    const logs = [
      makeLog('2024-07-08', 'completed'), // Mon
      makeLog('2024-07-09', 'completed'), // Tue
      makeLog('2024-07-10', 'completed'), // Wed
      makeLog('2024-07-11', 'completed'), // Thu
      makeLog('2024-07-12', 'completed'), // Fri
      // Sat/Sun are unscheduled — should not break streak
    ]
    const result = calculateStreak({ habit: makeHabit(), schedule, logs, today: new Date('2024-07-14') })
    expect(result.currentStreak).toBe(5)
  })

  it('tracks longest streak correctly', () => {
    const logs = [
      makeLog('2024-07-01', 'completed'),
      makeLog('2024-07-02', 'completed'),
      makeLog('2024-07-03', 'completed'),
      makeLog('2024-07-04', 'missed'),
      makeLog('2024-07-05', 'completed'),
      makeLog('2024-07-06', 'completed'),
    ]
    const result = calculateStreak({ habit: makeHabit(), schedule: makeSchedule(), logs, today: new Date('2024-07-06') })
    expect(result.longestStreak).toBe(3)
    expect(result.currentStreak).toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calculateStreak — weekly frequency
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateStreak — weekly_frequency', () => {
  it('counts a week where frequency target is met', () => {
    const schedule = makeSchedule({ schedule_type: 'weekly_frequency', frequency_target: 3 })
    const logs = [
      makeLog('2024-07-08', 'completed'), // Mon
      makeLog('2024-07-10', 'completed'), // Wed
      makeLog('2024-07-12', 'completed'), // Fri — 3 completions, meets target
    ]
    const result = calculateStreak({ habit: makeHabit(), schedule, logs, today: TODAY, weekStartsOn: 1 })
    expect(result.currentStreak).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// deriveOutcome
// ─────────────────────────────────────────────────────────────────────────────

describe('deriveOutcome', () => {
  it('returns completed for binary habit with value 1', () => {
    const habit = makeHabit({ habit_type: 'binary' })
    expect(deriveOutcome(habit, 1, false, false, true, false)).toBe('completed')
  })

  it('returns missed for binary habit with no progress on past day', () => {
    const habit = makeHabit({ habit_type: 'binary' })
    expect(deriveOutcome(habit, 0, false, false, true, false)).toBe('missed')
  })

  it('returns completed for quantity at target', () => {
    const habit = makeHabit({ habit_type: 'quantity', target_value: 20 })
    expect(deriveOutcome(habit, 20, false, false, true, false)).toBe('completed')
  })

  it('returns partial for quantity below target', () => {
    const habit = makeHabit({ habit_type: 'quantity', target_value: 20 })
    expect(deriveOutcome(habit, 10, false, false, true, false)).toBe('partial')
  })

  it('returns completed for limit habit at or below target', () => {
    const habit = makeHabit({ habit_type: 'limit', target_value: 60, success_direction: 'decrease' })
    expect(deriveOutcome(habit, 45, false, false, true, false)).toBe('completed')
    expect(deriveOutcome(habit, 60, false, false, true, false)).toBe('completed')
  })

  it('returns missed for limit habit exceeding target', () => {
    const habit = makeHabit({ habit_type: 'limit', target_value: 60, success_direction: 'decrease' })
    expect(deriveOutcome(habit, 90, false, false, true, false)).toBe('missed')
  })

  it('returns skipped when skipped flag set', () => {
    const habit = makeHabit()
    expect(deriveOutcome(habit, 0, true, false, true, false)).toBe('skipped')
  })

  it('returns excused_skip when excused flag set', () => {
    const habit = makeHabit()
    expect(deriveOutcome(habit, 0, true, true, true, false)).toBe('excused_skip')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calculateConsistencyScore
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateConsistencyScore', () => {
  it('returns 100 for perfect completion', () => {
    const habit = makeHabit()
    const schedule = makeSchedule()
    const logs = [
      makeLog('2024-07-08', 'completed'),
      makeLog('2024-07-09', 'completed'),
      makeLog('2024-07-10', 'completed'),
    ]
    const result = calculateConsistencyScore({
      habit,
      schedule,
      logs,
      fromDate: new Date('2024-07-08'),
      toDate: new Date('2024-07-10'),
    })
    expect(result.score).toBe(100)
  })

  it('does not penalize excused skips as harshly as misses', () => {
    const habit = makeHabit()
    const schedule = makeSchedule()

    const logsWithExcused = [
      makeLog('2024-07-08', 'completed'),
      makeLog('2024-07-09', 'excused_skip'),
    ]
    const logsWithMiss = [
      makeLog('2024-07-08', 'completed'),
      makeLog('2024-07-09', 'missed'),
    ]

    const excusedResult = calculateConsistencyScore({ habit, schedule, logs: logsWithExcused, fromDate: new Date('2024-07-08'), toDate: new Date('2024-07-09') })
    const missResult = calculateConsistencyScore({ habit, schedule, logs: logsWithMiss, fromDate: new Date('2024-07-08'), toDate: new Date('2024-07-09') })

    expect(excusedResult.score).toBeGreaterThan(missResult.score)
  })

  it('returns 0 for no scheduled opportunities', () => {
    const habit = makeHabit({ start_date: '2025-01-01' }) // future
    const schedule = makeSchedule()
    const result = calculateConsistencyScore({
      habit,
      schedule,
      logs: [],
      fromDate: new Date('2024-07-01'),
      toDate: new Date('2024-07-10'),
    })
    expect(result.score).toBe(0)
  })
})
