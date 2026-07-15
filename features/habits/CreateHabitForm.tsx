'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateHabit } from './useHabits'
import { todayString } from '@/lib/utils/date'
import type { HabitType, SuccessDirection } from '@/types'

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

const HABIT_COLOURS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#84cc16', '#64748b',
]

const schema = z.object({
  name: z.string().min(1, 'Habit name is required').max(100),
  habit_type: z.enum(['binary', 'quantity', 'duration', 'limit']),
  target_value: z.union([z.string(), z.number()]).optional().transform(v => v ? Number(v) : undefined),
  unit: z.string().optional(),
  schedule_type: z.enum(['daily', 'weekdays', 'weekly_frequency', 'weekly_cumulative']),
  weekdays: z.array(z.number()).optional(),
  frequency_target: z.union([z.string(), z.number()]).optional().transform(v => v ? Number(v) : undefined),
  cumulative_target: z.union([z.string(), z.number()]).optional().transform(v => v ? Number(v) : undefined),
  colour: z.string().default('#6366f1'),
  description: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const TYPE_DEFAULTS: Record<HabitType, Partial<FormValues>> = {
  binary: { target_value: undefined, unit: undefined },
  quantity: { target_value: 10, unit: '' },
  duration: { target_value: 30, unit: 'minutes' },
  limit: { target_value: 60, unit: '' },
}

export function CreateHabitForm() {
  const router = useRouter()
  const createHabit = useCreateHabit()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      habit_type: 'binary',
      schedule_type: 'daily',
      colour: '#6366f1',
      weekdays: [1, 2, 3, 4, 5],
    },
  })

  const habitType = watch('habit_type')
  const scheduleType = watch('schedule_type')
  const selectedColour = watch('colour')
  const weekdays = watch('weekdays') ?? []

  const handleTypeChange = (type: HabitType) => {
    setValue('habit_type', type)
    const defaults = TYPE_DEFAULTS[type]
    if (defaults.target_value !== undefined) setValue('target_value', defaults.target_value)
    if (defaults.unit !== undefined) setValue('unit', defaults.unit)
  }

  const toggleWeekday = (day: number) => {
    const current = weekdays
    const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day]
    setValue('weekdays', updated)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (values: any) => {
    const successDirection: SuccessDirection =
      values.habit_type === 'limit' ? 'decrease' : 'increase'

    await createHabit.mutateAsync({
      name: values.name,
      description: values.description,
      habit_type: values.habit_type,
      target_value: values.target_value,
      unit: values.unit,
      success_direction: successDirection,
      colour: values.colour,
      start_date: todayString(),
      notes: values.notes,
      schedule: {
        schedule_type: values.schedule_type,
        weekdays: values.schedule_type === 'weekdays' ? values.weekdays : undefined,
        frequency_target: values.schedule_type === 'weekly_frequency' ? values.frequency_target : undefined,
        cumulative_target: values.schedule_type === 'weekly_cumulative' ? values.cumulative_target : undefined,
      },
    })
    router.push('/today')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Habit name */}
      <div className="space-y-2">
        <Label htmlFor="name">Habit name *</Label>
        <Input
          id="name"
          placeholder="e.g. Meditate, Read 20 pages, Exercise"
          autoFocus
          aria-describedby={errors.name ? 'name-error' : undefined}
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Habit type */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium leading-none">Habit type</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['binary', 'quantity', 'duration', 'limit'] as HabitType[]).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              aria-pressed={habitType === type}
              className={cn(
                'rounded-lg border px-3 py-3 text-sm font-medium text-left transition-colors',
                'focus-visible:outline-2 focus-visible:outline-ring',
                habitType === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-accent',
              )}
            >
              <div className="font-semibold capitalize">{type}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {type === 'binary' && 'Done or not done'}
                {type === 'quantity' && 'Count or measure'}
                {type === 'duration' && 'Time-based'}
                {type === 'limit' && 'Stay under a limit'}
              </div>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Target (non-binary) */}
      {habitType !== 'binary' && (
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="target_value">
              Target {habitType === 'duration' ? '(minutes)' : habitType === 'limit' ? '(max)' : ''}
            </Label>
            <Input
              id="target_value"
              type="number"
              min="0"
              step="any"
              {...register('target_value')}
            />
          </div>
          {habitType !== 'duration' && (
            <div className="flex-1 space-y-2">
              <Label htmlFor="unit">Unit (optional)</Label>
              <Input id="unit" placeholder="glasses, pages, km..." {...register('unit')} />
            </div>
          )}
        </div>
      )}

      {/* Schedule */}
      <div className="space-y-3">
        <Label>Schedule</Label>
        <Controller
          name="schedule_type"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger aria-label="Schedule type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="weekdays">Selected days</SelectItem>
                <SelectItem value="weekly_frequency">X times per week</SelectItem>
                <SelectItem value="weekly_cumulative">Weekly total</SelectItem>
              </SelectContent>
            </Select>
          )}
        />

        {scheduleType === 'weekdays' && (
          <div className="flex gap-1.5" role="group" aria-label="Select days of week">
            {DAYS.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleWeekday(day.value)}
                aria-pressed={weekdays.includes(day.value)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-ring min-h-[40px]',
                  weekdays.includes(day.value)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent',
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
        )}

        {scheduleType === 'weekly_frequency' && (
          <div className="space-y-2">
            <Label htmlFor="frequency_target">Times per week</Label>
            <Input id="frequency_target" type="number" min="1" max="7" defaultValue="3" {...register('frequency_target')} />
          </div>
        )}

        {scheduleType === 'weekly_cumulative' && (
          <div className="space-y-2">
            <Label htmlFor="cumulative_target">Weekly total target</Label>
            <Input id="cumulative_target" type="number" min="1" {...register('cumulative_target')} />
          </div>
        )}
      </div>

      {/* Colour picker */}
      <div className="space-y-2">
        <Label>Colour</Label>
        <div className="flex flex-wrap gap-2">
          {HABIT_COLOURS.map(colour => (
            <button
              key={colour}
              type="button"
              onClick={() => setValue('colour', colour)}
              aria-pressed={selectedColour === colour}
              aria-label={`Select colour ${colour}`}
              className={cn(
                'h-8 w-8 rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring',
                selectedColour === colour && 'ring-2 ring-offset-2 ring-primary scale-110',
              )}
              style={{ backgroundColor: colour }}
            />
          ))}
        </div>
      </div>

      {/* Advanced section */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showAdvanced ? 'Hide' : 'Show'} optional settings
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 pl-1">
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" placeholder="Why this habit matters..." {...register('description')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" placeholder="Any additional notes..." {...register('notes')} />
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting || createHabit.isPending}>
          {isSubmitting || createHabit.isPending ? 'Creating...' : 'Create Habit'}
        </Button>
      </div>
    </form>
  )
}
