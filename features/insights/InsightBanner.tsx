'use client'

import { useMemo } from 'react'
import { Lightbulb } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { generateInsights } from '@/domain/insights/insight-engine'
import type { Habit, HabitSchedule } from '@/types'

interface InsightBannerProps {
  habits: Array<Habit & { schedule?: HabitSchedule[] }>
  today: Date
}

export function InsightBanner({ habits, today }: InsightBannerProps) {
  // We'll use the first insight from a simple synchronous calculation
  // (logs would be fetched per-habit in a real analytics pass)
  const insight = useMemo(() => {
    const items = habits
      .filter(h => h.schedule?.[0])
      .map(h => ({
        habit: h,
        schedule: h.schedule![0],
        logs: [], // simplified for the banner — full analytics page has real data
      }))

    const insights = generateInsights({ habits: items, today, weekStartsOn: 1 })
    return insights[0] ?? null
  }, [habits, today])

  if (!insight) return null

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Lightbulb
            className="h-4 w-4 text-primary shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-foreground/80">{insight.message}</p>
        </div>
      </CardContent>
    </Card>
  )
}
