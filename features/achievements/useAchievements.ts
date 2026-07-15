'use client'

import { useQuery } from '@tanstack/react-query'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import type { UserAchievement } from '@/types'

export function useUserAchievements() {
  const supabase = getSupabaseBrowserClient()
  return useQuery({
    queryKey: queryKeys.userAchievements(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .order('earned_at', { ascending: false })
      if (error) throw error
      return data as UserAchievement[]
    },
    staleTime: 60 * 1000,
  })
}

export function useAchievementCount() {
  const { data } = useUserAchievements()
  return data?.length ?? 0
}
