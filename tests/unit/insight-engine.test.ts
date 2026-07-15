import { describe, it, expect } from 'vitest'
import { generateInsights } from '@/domain/insights/insight-engine'
import type { Habit, HabitSchedule, HabitLog } from '@/types'

const TODAY = new Date('2024-07-12') // Friday

function makeHabit(id: string, name: string, overrides: Partial<Habit> = {}): Habit {
  return {
    id,
    user_id: 'user-1',
    name,
    description: null,
    habit_type: 'binary',
    target_value: null,
    unit: null,
    success_direction: 'increase',
    category_id: null,
    routine_id: null,
    colour: '#6366f1',
    icon: null,
    start_date: '2024-06-01',
    end_date: null,
    status: 'active',
    sort_order: 0,
    notes: null,
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    ...overrides,
  }
}

function makeSchedule(habitId: string): HabitSchedule {
  return {
    id: `schedule-${habitId}`,
    habit_id: habitId,
    user_id: 'user-1',
    schedule_type: 'daily',
    weekdays: null,
    frequency_target: null,
    cumulative_target: null,
    effective_from: '2024-06-01',
    effective_until: null,
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
  }
}

function makeLog(habitId: string, date: string, outcome: HabitLog['outcome']): HabitLog {
  return {
    id: `log-${habitId}-${date}`,
    habit_id: habitId,
    user_id: 'user-1',
    log_date: date,
    outcome,
    total_value: outcome === 'completed' ? 1 : 0,
    note: null,
    skip_reason: null,
    skipped_at: null,
    is_excused: outcome === 'excused_skip',
    created_at: `${date}T00:00:00Z`,
    updated_at: `${date}T00:00:00Z`,
  }
}

describe('generateInsights', () => {
  it('returns empty array for no habits', () => {
    const insights = generateInsights({ habits: [], today: TODAY })
    expect(insights).toHaveLength(0)
  })

  it('generates weekly completion insight', () => {
    const habit = makeHabit('h1', 'Meditate')
    const schedule = makeSchedule('h1')
    const logs = [
      makeLog('h1', '2024-07-08', 'completed'),
      makeLog('h1', '2024-07-09', 'completed'),
      makeLog('h1', '2024-07-10', 'completed'),
      makeLog('h1', '2024-07-11', 'completed'),
      makeLog('h1', '2024-07-12', 'completed'),
    ]

    const insights = generateInsights({
      habits: [{ habit, schedule, logs }],
      today: TODAY,
    })

    expect(insights.length).toBeGreaterThan(0)
    const weekly = insights.find(i => i.id === 'weekly_completion')
    expect(weekly).toBeDefined()
    expect(weekly!.message).toContain('%')
  })

  it('identifies strongest habit', () => {
    const h1 = makeHabit('h1', 'Reading')
    const h2 = makeHabit('h2', 'Exercise')

    // Create enough logs to exceed the 80% threshold for h1 (perfect) and low for h2
    const createLogsFromDates = (habitId: string, dates: string[], outcome: HabitLog['outcome']) =>
      dates.map(d => makeLog(habitId, d, outcome))

    const recentDates = Array.from({ length: 14 }, (_, i) => {
      const d = new Date('2024-07-12')
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    })

    const insights = generateInsights({
      habits: [
        {
          habit: h1,
          schedule: makeSchedule('h1'),
          logs: createLogsFromDates('h1', recentDates, 'completed'), // 100% rate
        },
        {
          habit: h2,
          schedule: makeSchedule('h2'),
          logs: [makeLog('h2', '2024-07-01', 'completed')], // ~7% rate
        },
      ],
      today: TODAY,
    })

    const strongest = insights.find(i => i.id === 'strongest_habit')
    expect(strongest?.habitName).toBe('Reading')
  })

  it('returns at most 5 insights', () => {
    const habits = Array.from({ length: 10 }, (_, i) => ({
      habit: makeHabit(`h${i}`, `Habit ${i}`),
      schedule: makeSchedule(`h${i}`),
      logs: [makeLog(`h${i}`, '2024-07-08', 'completed')],
    }))

    const insights = generateInsights({ habits, today: TODAY })
    expect(insights.length).toBeLessThanOrEqual(5)
  })
})
