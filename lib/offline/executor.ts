import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { PendingMutation } from '@/types'

export async function executeMutation(mutation: PendingMutation): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const p = mutation.payload

  switch (mutation.type) {
    case 'log_progress':
    case 'update_log': {
      const { error } = await supabase.from('habit_logs').upsert(
        {
          id: p.id as string ?? crypto.randomUUID(),
          habit_id: p.habit_id as string,
          user_id: user.id,
          log_date: p.log_date as string,
          outcome: p.outcome ?? null,
          total_value: (p.total_value as number) ?? 0,
          note: p.note ?? null,
        },
        { onConflict: 'habit_id,log_date', ignoreDuplicates: false },
      )
      if (error) throw error
      break
    }

    case 'skip_habit': {
      const { error } = await supabase.from('habit_logs').upsert(
        {
          id: p.id as string ?? crypto.randomUUID(),
          habit_id: p.habit_id as string,
          user_id: user.id,
          log_date: p.log_date as string,
          outcome: p.outcome as string,
          total_value: 0,
          skip_reason: p.skip_reason ?? null,
          is_excused: p.is_excused ?? false,
          note: p.note ?? null,
          skipped_at: p.skipped_at ?? new Date().toISOString(),
        },
        { onConflict: 'habit_id,log_date', ignoreDuplicates: false },
      )
      if (error) throw error
      break
    }

    default:
      throw new Error(`Unknown mutation type: ${mutation.type}`)
  }
}
