/**
 * DayByDay Sync Engine
 *
 * Conflict resolution: idempotent upserts with updated_at comparison.
 * Strategy: latest valid update wins, determined by updated_at timestamp.
 * Pending mutations are retried with exponential back-off (max 5 attempts).
 */

import { getPendingMutations, markMutationSynced, markMutationFailed } from './db'
import type { PendingMutation } from '@/types'

const MAX_ATTEMPTS = 5
const BASE_DELAY_MS = 1000

type SyncExecutor = (mutation: PendingMutation) => Promise<void>

export async function flushPendingMutations(execute: SyncExecutor): Promise<{
  synced: number
  failed: number
}> {
  const mutations = await getPendingMutations()
  let synced = 0
  let failed = 0

  for (const mutation of mutations) {
    if (mutation.attempts >= MAX_ATTEMPTS) {
      failed++
      continue
    }

    try {
      await execute(mutation)
      await markMutationSynced(mutation.id)
      synced++
    } catch {
      const newAttempts = mutation.attempts + 1
      await markMutationFailed(mutation.id, newAttempts)
      failed++
    }
  }

  return { synced, failed }
}

export function getRetryDelay(attempts: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempts), 30_000)
}
