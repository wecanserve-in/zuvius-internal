import { isTaskDueToday, isTaskOverdue, isTaskPending } from '@/services/tasks.service'
import { taskDisplayTitle } from '@/lib/tasks/taskContent'
import type { Task } from '@/types'
import { startOfDay, startOfWeek } from 'date-fns'

const APPROACHING_MS = 48 * 60 * 60 * 1000

export interface CompanionTaskLists {
  pending: Task[]
  overdue: Task[]
  dueToday: Task[]
  approaching: Task[]
  completedToday: Task[]
  completedThisWeek: number
}

export function computeCompanionTaskLists(tasks: Task[], userId: string): CompanionTaskLists {
  const mine = tasks.filter((t) => t.assigneeIds.includes(userId))
  const startToday = startOfDay(new Date()).getTime()
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  const now = Date.now()

  const pending: Task[] = []
  const overdue: Task[] = []
  const dueToday: Task[] = []
  const approaching: Task[] = []
  const completedToday: Task[] = []
  let completedThisWeek = 0

  for (const t of mine) {
    if (t.status === 'completed') {
      const ms = t.updatedAt?.toMillis() ?? t.createdAt?.toMillis() ?? 0
      if (ms >= startToday) completedToday.push(t)
      if (ms >= weekStart) completedThisWeek += 1
      continue
    }
    if (!isTaskPending(t)) continue

    pending.push(t)
    if (isTaskOverdue(t)) overdue.push(t)
    else if (isTaskDueToday(t)) dueToday.push(t)
    else if (t.deadlineAt) {
      const deadline = t.deadlineAt.toMillis()
      if (deadline > now && deadline - now <= APPROACHING_MS) approaching.push(t)
    }
  }

  const byDeadline = (a: Task, b: Task) =>
    (a.deadlineAt?.toMillis() ?? Number.POSITIVE_INFINITY) -
    (b.deadlineAt?.toMillis() ?? Number.POSITIVE_INFINITY)

  overdue.sort(byDeadline)
  dueToday.sort(byDeadline)
  approaching.sort(byDeadline)

  return {
    pending,
    overdue,
    dueToday,
    approaching,
    completedToday,
    completedThisWeek,
  }
}

export function taskDeadlineLabel(task: Task): string | null {
  if (!task.deadlineAt) return null
  try {
    return task.deadlineAt.toDate().toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

export function taskAlertTitle(task: Task): string {
  return taskDisplayTitle(task)
}
