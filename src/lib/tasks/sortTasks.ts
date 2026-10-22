import { isTaskOverdue, isTaskPending } from '@/services/tasks.service'
import type { Task } from '@/types'

const PRIORITY_RANK: Record<Task['priority'], number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function isDoneTask(task: Task): boolean {
  return !isTaskPending(task)
}

/**
 * Open tasks first (overdue, then higher priority, then sooner deadline),
 * completed/cancelled at the bottom (newest activity first within each group).
 */
export function sortTasksForDisplay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDone = isDoneTask(a)
    const bDone = isDoneTask(b)
    if (aDone !== bDone) return aDone ? 1 : -1

    if (!aDone && !bDone) {
      const aOver = isTaskOverdue(a)
      const bOver = isTaskOverdue(b)
      if (aOver !== bOver) return aOver ? -1 : 1

      const pri = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
      if (pri !== 0) return pri

      const aDeadline = a.deadlineAt?.toMillis() ?? Number.POSITIVE_INFINITY
      const bDeadline = b.deadlineAt?.toMillis() ?? Number.POSITIVE_INFINITY
      if (aDeadline !== bDeadline) return aDeadline - bDeadline
    }

    return (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0)
  })
}

export function overdueTaskSurfaceClass(overdue: boolean): string {
  if (!overdue) return ''
  return 'surface-overdue border'
}
