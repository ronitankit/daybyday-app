import type { Metadata } from 'next'
import { EditHabitView } from '@/features/habits/EditHabitView'

export const metadata: Metadata = { title: 'Edit Habit' }

export default function HabitDetailPage({ params }: { params: { habitId: string } }) {
  return <EditHabitView habitId={params.habitId} />
}
