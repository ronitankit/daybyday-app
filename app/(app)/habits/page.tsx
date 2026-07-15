import type { Metadata } from 'next'
import { HabitListView } from '@/features/habits/HabitListView'

export const metadata: Metadata = { title: 'Habits' }

export default function HabitsPage() {
  return <HabitListView />
}
