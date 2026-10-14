import { isTaskOverdue, isTaskPending } from '@/services/tasks.service'
import type { Task } from '@/types'

export interface TaskSummaryMetrics {
  total: number
  inProgress: number
  pending: number
  overdue: number
  completed: number
  needsReview: number
}

export function computeTaskMetrics(tasks: Task[]): TaskSummaryMetrics {
  let inProgress = 0
  let pending = 0
  let overdue = 0
  let completed = 0
  let needsReview = 0

  for (const t of tasks) {
    if (t.status === 'completed' || t.status === 'cancelled') {
      if (t.status === 'completed') completed += 1
      continue
    }
    if (isTaskOverdue(t)) overdue += 1
    if (t.status === 'in_progress') inProgress += 1
    else if (isTaskPending(t)) pending += 1
    if (t.status === 'needs_revision' || t.requiresReview) {
      needsReview += 1
    }
  }

  return {
    total: tasks.length,
    inProgress,
    pending,
    overdue,
    completed,
    needsReview,
  }
}
