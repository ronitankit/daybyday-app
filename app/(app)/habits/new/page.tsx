import type { Metadata } from 'next'
import { CreateHabitForm } from '@/features/habits/CreateHabitForm'

export const metadata: Metadata = { title: 'New Habit' }

export default function NewHabitPage() {
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-6">New Habit</h1>
      <CreateHabitForm />
    </div>
  )
}
