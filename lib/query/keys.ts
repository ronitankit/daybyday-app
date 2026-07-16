/**
 * Centralized TanStack Query key factory.
 * Structured for surgical cache invalidation.
 */

export const queryKeys = {
  // Profile
  profile: () => ['profile'] as const,
  preferences: () => ['preferences'] as const,

  // Categories
  categories: () => ['categories'] as const,
  category: (id: string) => ['categories', id] as const,

  // Routines
  routines: () => ['routines'] as const,
  routine: (id: string) => ['routines', id] as const,

  // Habits
  habits: () => ['habits'] as const,
  archivedHabits: () => ['habits', 'archived'] as const,
  habit: (id: string) => ['habits', id] as const,
  habitWithSchedule: (id: string) => ['habits', id, 'schedule'] as const,

  // Logs
  logs: (habitId: string) => ['logs', habitId] as const,
  logsForDate: (date: string) => ['logs', 'date', date] as const,
  logsForRange: (habitId: string, from: string, to: string) =>
    ['logs', habitId, from, to] as const,
  allLogsForDate: (date: string) => ['logs', 'all', date] as const,
  logsForDateRange: (from: string, to: string) => ['logs', 'range', from, to] as const,

  // Analytics
  analyticsDaily: (date: string) => ['analytics', 'daily', date] as const,
  analyticsWeekly: (weekStart: string) => ['analytics', 'weekly', weekStart] as const,
  analyticsMonthly: (month: string) => ['analytics', 'monthly', month] as const,
  habitAnalytics: (habitId: string, range: string) =>
    ['analytics', 'habit', habitId, range] as const,
  streaks: () => ['streaks'] as const,
  streak: (habitId: string) => ['streaks', habitId] as const,

  // Achievements
  achievements: () => ['achievements'] as const,
  userAchievements: () => ['user-achievements'] as const,

  // Skip reasons
  skipReasons: () => ['skip-reasons'] as const,
} as const
