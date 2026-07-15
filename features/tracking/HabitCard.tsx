'use client'

import { useState, useCallback } from 'react'
import { Check, ChevronDown, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Progress } from '@/components/ui/progress'
import { useToggleBinaryHabit, useLogProgress, useSkipHabit } from './useTracking'
import { formatDuration } from '@/lib/utils/date'
import type { Habit, HabitLog, HabitSchedule, OutcomeState } from '@/types'

interface HabitCardProps {
  habit: Habit & { quick_increments?: Array<{ value: number; label: string | null }> }
  schedule?: HabitSchedule
  log: HabitLog | null
  date: string
  isHistorical?: boolean
}

const OUTCOME_CONFIG: Record<OutcomeState, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  partial: { label: 'In progress', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  missed: { label: 'Missed', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  skipped: { label: 'Skipped', className: 'bg-muted text-muted-foreground' },
  excused_skip: { label: 'Excused', className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
}

export function HabitCard({ habit, log, date, isHistorical = false }: HabitCardProps) {
  const [expanded, setExpanded] = useState(false)
  const toggleBinary = useToggleBinaryHabit()
  const logProgress = useLogProgress()
  const skipHabit = useSkipHabit()

  const currentValue = log?.total_value ?? 0
  const outcome = log?.outcome ?? null
  const isCompleted = outcome === 'completed'

  const progressPercent = calcProgressPercent(habit.target_value, currentValue)

  const handleBinaryToggle = useCallback(() => {
    toggleBinary.mutate({ habit_id: habit.id, log_date: date, currentOutcome: outcome })
  }, [toggleBinary, habit.id, date, outcome])

  const handleIncrement = useCallback((value: number) => {
    logProgress.mutate({
      habit_id: habit.id,
      log_date: date,
      value,
      habit,
      isScheduled: true,
    })
  }, [logProgress, habit, date])

  const handleSkip = useCallback(() => {
    skipHabit.mutate({ habit_id: habit.id, log_date: date, is_excused: false })
  }, [skipHabit, habit.id, date])

  return (
    <article
      className={cn(
        'rounded-xl border bg-card transition-colors duration-150',
        isCompleted && 'border-green-500/30 bg-green-500/5',
        outcome === 'missed' && 'opacity-75',
      )}
      aria-label={`${habit.name} habit`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Colour indicator */}
        <div
          className="mt-0.5 h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: habit.colour }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={cn(
                'font-medium text-sm leading-tight truncate',
                isCompleted && 'line-through text-muted-foreground',
              )}>
                {habit.name}
              </h3>
              {habit.habit_type !== 'binary' && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatProgress(habit, currentValue)}
                </p>
              )}
            </div>

            {/* Outcome badge */}
            {outcome && (
              <span
                className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0',
                  OUTCOME_CONFIG[outcome].className,
                )}
                role="status"
                aria-live="polite"
              >
                {OUTCOME_CONFIG[outcome].label}
              </span>
            )}
          </div>

          {/* Progress bar for non-binary */}
          {habit.habit_type !== 'binary' && habit.target_value && (
            <div className="mt-2">
              <LimitOrProgress habit={habit} value={currentValue} percent={progressPercent} />
            </div>
          )}
        </div>

        {/* Primary action */}
        <div className="shrink-0">
          {habit.habit_type === 'binary' ? (
            <button
              onClick={handleBinaryToggle}
              disabled={toggleBinary.isPending}
              aria-pressed={isCompleted}
              aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
              className={cn(
                'h-11 w-11 rounded-xl flex items-center justify-center transition-all',
                'focus-visible:outline-2 focus-visible:outline-ring',
                isCompleted
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'border-2 border-muted-foreground/30 hover:border-primary text-muted-foreground hover:text-primary',
              )}
            >
              {isCompleted ? (
                <Check className="h-5 w-5" strokeWidth={2.5} />
              ) : (
                <Check className="h-5 w-5 opacity-40" />
              )}
            </button>
          ) : (
            <button
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse controls' : 'Expand controls'}
              className={cn(
                'h-9 w-9 rounded-lg flex items-center justify-center transition-colors',
                'border border-border hover:bg-accent text-muted-foreground hover:text-foreground',
                'focus-visible:outline-2 focus-visible:outline-ring',
              )}
            >
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
              />
            </button>
          )}
        </div>
      </div>

      {/* Expanded controls for quantity/duration/limit */}
      {expanded && habit.habit_type !== 'binary' && (
        <div className="px-4 pb-4 pt-0 border-t border-border/50 mt-1">
          <QuickIncrements
            habit={habit}
            onIncrement={handleIncrement}
            pending={logProgress.isPending}
          />
          {!isHistorical && (
            <button
              onClick={handleSkip}
              className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-1"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip today
            </button>
          )}
        </div>
      )}
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function calcProgressPercent(target: number | null, value: number): number {
  if (!target) return 0
  return Math.min(100, Math.round((value / target) * 100))
}

function formatProgress(habit: Habit, value: number): string {
  const unit = habit.unit ?? ''
  const target = habit.target_value ?? 0

  if (habit.habit_type === 'duration') {
    return `${formatDuration(value)} / ${formatDuration(target)}`
  }
  if (habit.success_direction === 'decrease' || habit.success_direction === 'zero') {
    return `${value}${unit ? ' ' + unit : ''} used${target ? ` / max ${target}` : ''}`
  }
  return `${value}${unit ? ' ' + unit : ''} / ${target}${unit ? ' ' + unit : ''}`
}

function LimitOrProgress({
  habit,
  value,
  percent,
}: {
  habit: Habit
  value: number
  percent: number
}) {
  const isLimit = habit.success_direction === 'decrease' || habit.success_direction === 'zero'

  if (isLimit) {
    const target = habit.target_value ?? 0
    const safePercent = target > 0 ? Math.min(100, (value / target) * 100) : 0
    const isExceeded = value > target
    const isApproaching = safePercent >= 75 && !isExceeded

    return (
      <div>
        <div className="relative h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              isExceeded ? 'bg-red-500' : isApproaching ? 'bg-yellow-500' : 'bg-green-500',
            )}
            style={{ width: `${Math.min(100, safePercent)}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemax={target}
            aria-label={`${value} of ${target} ${habit.unit ?? 'used'}`}
          />
        </div>
        <p className={cn(
          'text-[10px] mt-1 font-medium',
          isExceeded ? 'text-red-500' : isApproaching ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400',
        )}>
          {isExceeded ? 'Limit exceeded' : isApproaching ? 'Approaching limit' : 'Within limit'}
        </p>
      </div>
    )
  }

  return (
    <Progress
      value={percent}
      className="h-1.5"
      aria-label={`${percent}% complete`}
      indicatorClassName={percent >= 100 ? 'bg-green-500' : 'bg-primary'}
    />
  )
}

function QuickIncrements({
  habit,
  onIncrement,
  pending,
}: {
  habit: HabitCardProps['habit']
  onIncrement: (v: number) => void
  pending: boolean
}) {
  const increments = habit.quick_increments?.length
    ? habit.quick_increments
    : getDefaultIncrements(habit)

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {increments.map((inc, i) => (
        <button
          key={i}
          onClick={() => onIncrement(inc.value)}
          disabled={pending}
          aria-label={`Add ${inc.label ?? inc.value} ${habit.unit ?? ''}`}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium border border-border',
            'bg-background hover:bg-accent transition-colors',
            'focus-visible:outline-2 focus-visible:outline-ring',
            'disabled:opacity-50',
            'min-h-[36px]',
          )}
        >
          +{inc.label ?? formatIncrementValue(inc.value, habit)}
        </button>
      ))}
    </div>
  )
}

function getDefaultIncrements(habit: Habit) {
  if (habit.habit_type === 'duration') {
    return [{ value: 5, label: '5m' }, { value: 15, label: '15m' }, { value: 30, label: '30m' }]
  }
  const target = habit.target_value ?? 10
  if (target <= 10) return [{ value: 1, label: null }, { value: 2, label: null }, { value: 5, label: null }]
  if (target <= 50) return [{ value: 1, label: null }, { value: 5, label: null }, { value: 10, label: null }]
  return [{ value: 5, label: null }, { value: 10, label: null }, { value: 25, label: null }]
}

function formatIncrementValue(value: number, habit: Habit): string {
  if (habit.habit_type === 'duration') return formatDuration(value)
  return `${value}${habit.unit ? ' ' + habit.unit : ''}`
}
