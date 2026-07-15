// ─────────────────────────────────────────────────────────────────────────────
// Core domain types for DayByDay
// ─────────────────────────────────────────────────────────────────────────────

export type HabitType = 'binary' | 'quantity' | 'duration' | 'limit'
export type ScheduleType = 'daily' | 'weekdays' | 'weekly_frequency' | 'weekly_cumulative'
export type HabitStatus = 'active' | 'paused' | 'archived'
export type OutcomeState = 'completed' | 'partial' | 'missed' | 'skipped' | 'excused_skip'
export type SuccessDirection = 'increase' | 'decrease' | 'zero'
export type Theme = 'light' | 'dark' | 'system'
export type SyncStatus = 'saved' | 'syncing' | 'offline' | 'failed'

// ─────────────────────────────────────────────────────────────────────────────
// Database row types (match Supabase schema)
// ─────────────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  timezone: string
  week_start: number
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  theme: Theme
  notification_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  end_of_day_reminder: boolean
  end_of_day_time: string | null
  default_week_start: number
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  colour: string
  icon: string | null
  sort_order: number
  is_default: boolean
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Routine {
  id: string
  user_id: string
  name: string
  description: string | null
  colour: string
  icon: string | null
  sort_order: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  description: string | null
  habit_type: HabitType
  target_value: number | null
  unit: string | null
  success_direction: SuccessDirection
  category_id: string | null
  routine_id: string | null
  colour: string
  icon: string | null
  start_date: string
  end_date: string | null
  status: HabitStatus
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string
  // Joined relations
  schedule?: HabitSchedule
  quick_increments?: HabitQuickIncrement[]
  category?: Category | null
  routine?: Routine | null
}

export interface HabitSchedule {
  id: string
  habit_id: string
  user_id: string
  schedule_type: ScheduleType
  weekdays: number[] | null
  frequency_target: number | null
  cumulative_target: number | null
  effective_from: string
  effective_until: string | null
  created_at: string
  updated_at: string
}

export interface HabitQuickIncrement {
  id: string
  habit_id: string
  user_id: string
  value: number
  label: string | null
  sort_order: number
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  log_date: string
  outcome: OutcomeState | null
  total_value: number
  note: string | null
  skip_reason: string | null
  skipped_at: string | null
  is_excused: boolean
  created_at: string
  updated_at: string
  // Joined
  events?: HabitLogEvent[]
}

export interface HabitLogEvent {
  id: string
  log_id: string
  habit_id: string
  user_id: string
  value: number
  note: string | null
  recorded_at: string
  created_at: string
  updated_at: string
}

export interface SkipReason {
  id: string
  user_id: string
  label: string
  is_excused: boolean
  is_default: boolean
  sort_order: number
  created_at: string
}

export interface HabitReminder {
  id: string
  habit_id: string
  user_id: string
  remind_time: string
  only_incomplete: boolean
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface Achievement {
  id: string
  key: string
  title: string
  description: string
  icon: string
  category: string
  threshold: number | null
  created_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  habit_id: string | null
  earned_at: string
  achievement?: Achievement
}

export interface GuestMigration {
  id: string
  user_id: string
  migration_id: string
  status: 'pending' | 'completed' | 'failed'
  habit_count: number
  log_count: number
  error_message: string | null
  started_at: string
  completed_at: string | null
  created_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain / computed types
// ─────────────────────────────────────────────────────────────────────────────

export interface HabitWithLog extends Habit {
  log?: HabitLog | null
  todayValue: number
  outcomeState: OutcomeState | null
  isScheduledToday: boolean
  progressPercent: number
}

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastCompletedDate: string | null
}

export interface DailyStats {
  date: string
  scheduledCount: number
  completedCount: number
  partialCount: number
  missedCount: number
  skippedCount: number
  completionRate: number
}

export interface WeeklyStats {
  weekStart: string
  weekEnd: string
  scheduledDays: number
  completedDays: number
  completionRate: number
  habitStats: HabitWeekStats[]
}

export interface HabitWeekStats {
  habit_id: string
  completedDays: number
  scheduledDays: number
  totalValue: number
}

export interface ConsistencyScore {
  score: number // 0-100
  label: string
  scheduledOpportunities: number
  completedOpportunities: number
  excusedSkips: number
}

export interface InsightMessage {
  id: string
  message: string
  type: 'positive' | 'neutral' | 'actionable'
  habitId?: string
  habitName?: string
  priority: number
}

export interface AnalyticsSummary {
  todayCompletion: number
  weeklyCompletion: number
  monthlyCompletion: number
  currentStreak: number
  longestStreak: number
  consistencyScore: ConsistencyScore
  strongestHabit: Habit | null
  weakestHabit: Habit | null
  mostImprovedHabit: Habit | null
  bestWeekday: number | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Form / input types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateHabitInput {
  name: string
  description?: string
  habit_type: HabitType
  target_value?: number
  unit?: string
  success_direction: SuccessDirection
  category_id?: string
  routine_id?: string
  colour: string
  icon?: string
  start_date: string
  end_date?: string
  notes?: string
  schedule: CreateScheduleInput
  quick_increments?: QuickIncrementInput[]
  reminders?: ReminderInput[]
}

export interface CreateScheduleInput {
  schedule_type: ScheduleType
  weekdays?: number[]
  frequency_target?: number
  cumulative_target?: number
}

export interface QuickIncrementInput {
  value: number
  label?: string
  sort_order: number
}

export interface ReminderInput {
  remind_time: string
  only_incomplete: boolean
}

export interface LogProgressInput {
  habit_id: string
  log_date: string
  value: number
  note?: string
}

export interface SkipHabitInput {
  habit_id: string
  log_date: string
  skip_reason?: string
  is_excused: boolean
  note?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline / sync types
// ─────────────────────────────────────────────────────────────────────────────

export interface PendingMutation {
  id: string
  type: 'log_progress' | 'skip_habit' | 'create_habit' | 'update_habit' | 'delete_habit' | 'update_log'
  payload: Record<string, unknown>
  createdAt: number
  attempts: number
  lastAttempt: number | null
}

export interface SyncState {
  status: SyncStatus
  pendingCount: number
  lastSynced: number | null
}
