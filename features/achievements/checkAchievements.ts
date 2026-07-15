import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface CheckContext {
  userId: string
  maxStreak: number
  totalCompleted: number
}

const STREAK_THRESHOLDS = [3, 7, 14, 30, 60, 100]
const TOTAL_THRESHOLDS = [10, 50, 100, 500]

export async function checkAndAwardAchievements(ctx: CheckContext): Promise<void> {
  const supabase = getSupabaseBrowserClient()

  // Fetch all achievements and already-earned ones in parallel
  const [{ data: allAchievements }, { data: earned }] = await Promise.all([
    supabase.from('achievements').select('id, key, title, icon, threshold, category'),
    supabase.from('user_achievements').select('achievement_id').eq('user_id', ctx.userId),
  ])

  if (!allAchievements) return
  const earnedIds = new Set((earned ?? []).map((e: { achievement_id: string }) => e.achievement_id))

  const toAward: Array<{ achievement_id: string; title: string; icon: string }> = []

  for (const achievement of allAchievements) {
    if (earnedIds.has(achievement.id)) continue

    let qualifies = false

    if (achievement.category === 'streak' && achievement.threshold != null) {
      qualifies = STREAK_THRESHOLDS.includes(achievement.threshold) && ctx.maxStreak >= achievement.threshold
    } else if (achievement.category === 'milestone' && achievement.threshold != null) {
      qualifies = TOTAL_THRESHOLDS.includes(achievement.threshold) && ctx.totalCompleted >= achievement.threshold
    } else if (achievement.key === 'first_habit') {
      qualifies = ctx.totalCompleted >= 1
    }

    if (qualifies) toAward.push({ achievement_id: achievement.id, title: achievement.title, icon: achievement.icon })
  }

  if (toAward.length === 0) return

  // Insert new achievements
  await supabase.from('user_achievements').insert(
    toAward.map(a => ({
      id: crypto.randomUUID(),
      user_id: ctx.userId,
      achievement_id: a.achievement_id,
      earned_at: new Date().toISOString(),
    })),
  )

  // Notify user
  for (const a of toAward) {
    toast.success(`${a.icon} Achievement unlocked: ${a.title}`, {
      duration: 5000,
    })
  }
}
