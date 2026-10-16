import { isTaskOverdue } from '@/services/tasks.service'
import type { Task } from '@/types'

/** Overdue open tasks first, then by nearest deadline. */
export function sortTasksForDisplay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aOver = isTaskOverdue(a)
    const bOver = isTaskOverdue(b)
    if (aOver !== bOver) return aOver ? -1 : 1

    const aDeadline = a.deadlineAt?.toMillis() ?? Number.POSITIVE_INFINITY
    const bDeadline = b.deadlineAt?.toMillis() ?? Number.POSITIVE_INFINITY
    if (aDeadline !== bDeadline) return aDeadline - bDeadline

    return (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0)
  })
}

export function overdueTaskSurfaceClass(overdue: boolean): string {
  if (!overdue) return ''
  return 'border-red-300/80 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/35 dark:text-red-50'
}
