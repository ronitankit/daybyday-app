'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GripVertical, Archive, ArchiveRestore, Pause, Play, PenLine } from 'lucide-react'
import { useHabits, useArchivedHabits, useReorderHabits, useUpdateHabit, useArchiveHabit, useUnarchiveHabit } from './useHabits'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import type { Habit } from '@/types'

export function HabitListView() {
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'archived'>('all')

  const { data: habits, isLoading } = useHabits()
  const { data: archivedHabits, isLoading: isLoadingArchived } = useArchivedHabits()
  const reorder = useReorderHabits()
  const updateHabit = useUpdateHabit()
  const archiveHabit = useArchiveHabit()
  const unarchiveHabit = useUnarchiveHabit()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const isArchivedTab = filter === 'archived'

  const filteredHabits = habits?.filter(h => {
    if (filter === 'all') return true
    return h.status === filter
  }) ?? []

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !habits) return

    const oldIndex = habits.findIndex(h => h.id === active.id)
    const newIndex = habits.findIndex(h => h.id === over.id)
    const reordered = arrayMove(habits, oldIndex, newIndex)
    reorder.mutate(reordered.map((h, i) => ({ id: h.id, sort_order: i })))
  }, [habits, reorder])

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
        <Button asChild size="sm">
          <Link href="/habits/new">
            <Plus className="h-4 w-4" />
            Add habit
          </Link>
        </Button>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit" role="tablist" aria-label="Filter habits">
        {(['all', 'active', 'paused', 'archived'] as const).map(f => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors',
              'focus-visible:outline-2 focus-visible:outline-ring min-h-[36px]',
              filter === f
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {isArchivedTab ? (
        isLoadingArchived ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : !archivedHabits || archivedHabits.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
            <p className="font-medium">No archived habits</p>
            <p className="text-sm text-muted-foreground mt-1">Habits you archive will show up here.</p>
          </div>
        ) : (
          <ul className="space-y-2" aria-label="Archived habit list">
            {archivedHabits.map(habit => (
              <ArchivedHabitRow
                key={habit.id}
                habit={habit}
                onUnarchive={() => unarchiveHabit.mutate(habit.id)}
              />
            ))}
          </ul>
        )
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">No habits found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === 'all' ? 'Add your first habit to get started.' : `No ${filter} habits.`}
          </p>
          {filter === 'all' && (
            <Button asChild className="mt-4">
              <Link href="/habits/new"><Plus className="h-4 w-4" /> New habit</Link>
            </Button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filteredHabits.map(h => h.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2" aria-label="Habit list">
              {filteredHabits.map(habit => (
                <SortableHabitRow
                  key={habit.id}
                  habit={habit}
                  onPauseToggle={() =>
                    updateHabit.mutate({ id: habit.id, status: habit.status === 'paused' ? 'active' : 'paused' })
                  }
                  onArchive={() => archiveHabit.mutate(habit.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function ArchivedHabitRow({
  habit,
  onUnarchive,
}: {
  habit: Habit
  onUnarchive: () => void
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      {/* Colour dot */}
      <div
        className="h-3 w-3 rounded-full shrink-0"
        style={{ backgroundColor: habit.colour }}
        aria-hidden="true"
      />

      {/* Name and meta */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{habit.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground capitalize">{habit.habit_type}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">Archived</Badge>
        </div>
      </div>

      {/* Actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onUnarchive}
        aria-label={`Unarchive ${habit.name}`}
      >
        <ArchiveRestore className="h-4 w-4" />
        Unarchive
      </Button>
    </li>
  )
}

function SortableHabitRow({
  habit,
  onPauseToggle,
  onArchive,
}: {
  habit: Habit
  onPauseToggle: () => void
  onArchive: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: habit.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card px-4 py-3',
        'focus-within:ring-2 focus-within:ring-ring',
        isDragging && 'shadow-lg',
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Colour dot */}
      <div
        className="h-3 w-3 rounded-full shrink-0"
        style={{ backgroundColor: habit.colour }}
        aria-hidden="true"
      />

      {/* Name and meta */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{habit.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground capitalize">{habit.habit_type}</span>
          {habit.status === 'paused' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Paused</Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${habit.name}`}
        >
          <Link href={`/habits/${habit.id}`}>
            <PenLine className="h-4 w-4" />
          </Link>
        </Button>
        <button
          onClick={onPauseToggle}
          aria-label={habit.status === 'paused' ? 'Resume habit' : 'Pause habit'}
          className={cn(
            'h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground',
            'hover:bg-accent hover:text-foreground transition-colors',
            'focus-visible:outline-2 focus-visible:outline-ring',
          )}
        >
          {habit.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
        <button
          onClick={onArchive}
          aria-label={`Archive ${habit.name}`}
          className={cn(
            'h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground',
            'hover:bg-destructive/10 hover:text-destructive transition-colors',
            'focus-visible:outline-2 focus-visible:outline-ring',
          )}
        >
          <Archive className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}
