import type { Metadata } from 'next'
import { HabitForm } from '@/features/habits/HabitForm'

export const metadata: Metadata = { title: 'New Habit' }

export default function NewHabitPage() {
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-6">New Habit</h1>
      <HabitForm />
    </div>
  )
}
