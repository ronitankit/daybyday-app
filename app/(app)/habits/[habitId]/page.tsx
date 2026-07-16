import type { Metadata } from 'next'
import { EditHabitView } from '@/features/habits/EditHabitView'

export const metadata: Metadata = { title: 'Edit Habit' }

export default async function HabitDetailPage({ params }: { params: Promise<{ habitId: string }> }) {
  const { habitId } = await params
  return <EditHabitView habitId={habitId} />
}
