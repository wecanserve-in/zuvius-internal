import { computeCompanionTaskLists } from '@/lib/companion/companionTaskLists'
import type { Task } from '@/types'

export interface CompanionTaskStats {
  pendingCount: number
  dueTodayCount: number
  overdueCount: number
  approachingCount: number
  completedTodayCount: number
  urgentPendingCount: number
}

export function computeCompanionStats(tasks: Task[], userId: string): CompanionTaskStats {
  const lists = computeCompanionTaskLists(tasks, userId)
  const urgentPendingCount = lists.pending.filter(
    (t) => t.priority === 'urgent' || t.priority === 'high',
  ).length

  return {
    pendingCount: lists.pending.length,
    dueTodayCount: lists.dueToday.length,
    overdueCount: lists.overdue.length,
    approachingCount: lists.approaching.length,
    completedTodayCount: lists.completedToday.length,
    urgentPendingCount,
  }
}

export type CompanionMood =
  | 'idle'
  | 'assigned'
  | 'celebrate'
  | 'concerned'
  | 'overdue'
  | 'relaxed'

export function pickCompanionMood(stats: CompanionTaskStats): CompanionMood {
  if (stats.overdueCount > 0) return 'overdue'
  if (stats.approachingCount > 0) return 'concerned'
  if (stats.pendingCount === 0 && stats.dueTodayCount === 0) return 'relaxed'
  return 'idle'
}
