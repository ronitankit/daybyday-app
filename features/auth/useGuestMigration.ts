'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getDB, getGuestId } from '@/lib/offline/db'

const MIGRATION_FLAG = 'dbd_migration_done'

export function useGuestMigration(userId: string | null) {
  const migrating = useRef(false)

  useEffect(() => {
    if (!userId || migrating.current) return
    if (typeof window === 'undefined') return
    if (localStorage.getItem(MIGRATION_FLAG) === userId) return

    migrating.current = true
    migrateGuestData(userId).finally(() => {
      migrating.current = false
    })
  }, [userId])
}

async function migrateGuestData(userId: string): Promise<void> {
  const db = getDB()
  const guestId = getGuestId()

  const [habits, logs] = await Promise.all([
    db.habits.where('user_id').equals(guestId).toArray(),
    db.habit_logs.where('user_id').equals(guestId).toArray(),
  ])

  if (habits.length === 0 && logs.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, userId)
    return
  }

  const supabase = getSupabaseBrowserClient()

  // Record migration start
  const migrationId = crypto.randomUUID()
  await supabase.from('guest_migrations').insert({
    id: migrationId,
    user_id: userId,
    migration_id: guestId,
    status: 'pending',
    habit_count: habits.length,
    log_count: logs.length,
    started_at: new Date().toISOString(),
  }).throwOnError()

  const toastId = toast.loading(`Importing ${habits.length} habit${habits.length !== 1 ? 's' : ''} from guest session…`)

  try {
    if (habits.length > 0) {
      // Fetch schedules and quick increments for guest habits
      const habitIds = habits.map(h => h.id)
      const [schedules, increments] = await Promise.all([
        db.habit_schedules.where('habit_id').anyOf(habitIds).toArray(),
        db.habit_quick_increments.where('habit_id').anyOf(habitIds).toArray(),
      ])

      // Remap user_id to authenticated user
      const remappedHabits = habits.map(h => ({ ...h, user_id: userId }))
      const remappedSchedules = schedules.map(s => ({ ...s, user_id: userId }))
      const remappedIncrements = increments.map(i => ({ ...i, user_id: userId }))
      const remappedLogs = logs.map(l => ({ ...l, user_id: userId }))

      // Insert in dependency order: habits → schedules/increments → logs
      if (remappedHabits.length > 0) {
        await supabase.from('habits').upsert(remappedHabits, { onConflict: 'id' }).throwOnError()
      }
      if (remappedSchedules.length > 0) {
        await supabase.from('habit_schedules').upsert(remappedSchedules, { onConflict: 'id' }).throwOnError()
      }
      if (remappedIncrements.length > 0) {
        await supabase.from('habit_quick_increments').upsert(remappedIncrements, { onConflict: 'id' }).throwOnError()
      }
      if (remappedLogs.length > 0) {
        await supabase.from('habit_logs').upsert(remappedLogs, { onConflict: 'id' }).throwOnError()
      }
    }

    // Mark migration complete
    await supabase.from('guest_migrations').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', migrationId).throwOnError()

    // Clear local guest data
    await db.habits.where('user_id').equals(guestId).delete()
    await db.habit_logs.where('user_id').equals(guestId).delete()
    await db.habit_schedules.where('user_id').equals(guestId).delete()
    await db.habit_quick_increments.where('user_id').equals(guestId).delete()

    localStorage.setItem(MIGRATION_FLAG, userId)

    toast.success(
      `${habits.length} habit${habits.length !== 1 ? 's' : ''} imported successfully!`,
      { id: toastId },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await supabase.from('guest_migrations').update({
      status: 'failed',
      error_message: message,
    }).eq('id', migrationId)

    toast.error('Could not import guest data. Your habits are still available locally.', { id: toastId })
  }
}
