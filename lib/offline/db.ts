/**
 * DayByDay IndexedDB via Dexie
 * Stores guest data and offline mutation queue.
 */

import Dexie, { type Table } from 'dexie'
import type {
  Habit,
  HabitSchedule,
  HabitQuickIncrement,
  HabitLog,
  HabitLogEvent,
  Category,
  Routine,
  HabitReminder,
  UserPreferences,
  PendingMutation,
} from '@/types'

export class DayByDayDB extends Dexie {
  habits!: Table<Habit>
  habit_schedules!: Table<HabitSchedule>
  habit_quick_increments!: Table<HabitQuickIncrement>
  habit_logs!: Table<HabitLog>
  habit_log_events!: Table<HabitLogEvent>
  categories!: Table<Category>
  routines!: Table<Routine>
  habit_reminders!: Table<HabitReminder>
  preferences!: Table<UserPreferences & { id: string }>
  pending_mutations!: Table<PendingMutation>

  constructor() {
    super('daybyday')
    this.version(1).stores({
      habits: 'id, user_id, status, category_id, routine_id, sort_order',
      habit_schedules: 'id, habit_id, user_id',
      habit_quick_increments: 'id, habit_id, user_id',
      habit_logs: 'id, habit_id, user_id, log_date, [habit_id+log_date]',
      habit_log_events: 'id, log_id, habit_id, user_id',
      categories: 'id, user_id, sort_order',
      routines: 'id, user_id, sort_order',
      habit_reminders: 'id, habit_id, user_id',
      preferences: 'id, user_id',
      pending_mutations: 'id, type, createdAt',
    })
  }
}

let _db: DayByDayDB | null = null

export function getDB(): DayByDayDB {
  if (!_db) _db = new DayByDayDB()
  return _db
}

// ─────────────────────────────────────────────────────────────────────────────
// Guest user ID
// ─────────────────────────────────────────────────────────────────────────────

const GUEST_ID_KEY = 'dbd_guest_id'

export function getGuestId(): string {
  if (typeof window === 'undefined') return 'guest'
  let id = localStorage.getItem(GUEST_ID_KEY)
  if (!id) {
    id = `guest_${crypto.randomUUID()}`
    localStorage.setItem(GUEST_ID_KEY, id)
  }
  return id
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending mutation queue
// ─────────────────────────────────────────────────────────────────────────────

export async function enqueueMutation(mutation: Omit<PendingMutation, 'attempts' | 'lastAttempt'>): Promise<void> {
  const db = getDB()
  await db.pending_mutations.put({
    ...mutation,
    attempts: 0,
    lastAttempt: null,
  })
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = getDB()
  return db.pending_mutations.orderBy('createdAt').toArray()
}

export async function markMutationSynced(id: string): Promise<void> {
  const db = getDB()
  await db.pending_mutations.delete(id)
}

export async function markMutationFailed(id: string, attempts: number): Promise<void> {
  const db = getDB()
  await db.pending_mutations.update(id, {
    attempts,
    lastAttempt: Date.now(),
  })
}

export async function clearPendingMutations(): Promise<void> {
  const db = getDB()
  await db.pending_mutations.clear()
}
