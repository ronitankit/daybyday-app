import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  isToday,
  isSameDay,
  differenceInDays,
  getISODay,
  getDay,
  isAfter,
  isBefore,
  isWithinInterval,
} from 'date-fns'

export {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  isToday,
  isSameDay,
  differenceInDays,
  getISODay,
  getDay,
  isAfter,
  isBefore,
  isWithinInterval,
}

/** Returns YYYY-MM-DD string for a Date object */
export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Parses a YYYY-MM-DD string to a Date at midnight local time */
export function fromDateString(dateStr: string): Date {
  return parseISO(dateStr)
}

/** Today as YYYY-MM-DD */
export function todayString(): string {
  return toDateString(new Date())
}

/** Formats a date for display, e.g. "Monday, Jul 12" */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'EEEE, MMM d')
}

/** Formats a date as short, e.g. "Jul 12" */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d')
}

/** Gets ISO weekday (1=Mon...7=Sun) */
export function getIsoWeekday(date: Date): number {
  return getISODay(date)
}

/** Gets dates for the current week (Mon-Sun by default) */
export function getWeekDates(
  date: Date,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1,
): Date[] {
  const start = startOfWeek(date, { weekStartsOn })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Checks if a date is within a habit's active range */
export function isHabitActiveOnDate(
  habitStartDate: string,
  habitEndDate: string | null,
  date: Date,
): boolean {
  const start = parseISO(habitStartDate)
  const end = habitEndDate ? parseISO(habitEndDate) : null
  if (isBefore(date, startOfDay(start))) return false
  if (end && isAfter(date, endOfDay(end))) return false
  return true
}

/** Returns array of YYYY-MM-DD strings between two dates inclusive */
export function getDateRange(start: string, end: string): string[] {
  const dates: string[] = []
  let current = parseISO(start)
  const endDate = parseISO(end)
  while (!isAfter(current, endDate)) {
    dates.push(toDateString(current))
    current = addDays(current, 1)
  }
  return dates
}

/** Formats minutes to readable string like "1h 30m" or "45m" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Relative label for a date: "Today", "Yesterday", "Tomorrow", or date string */
export function relativeDateLabel(dateStr: string): string {
  const date = parseISO(dateStr)
  const today = new Date()
  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, subDays(today, 1))) return 'Yesterday'
  if (isSameDay(date, addDays(today, 1))) return 'Tomorrow'
  return format(date, 'MMM d')
}
