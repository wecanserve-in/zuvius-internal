import { isTaskDueToday, isTaskOverdue, isTaskPending } from '@/services/tasks.service'
import type { Project, Task } from '@/types'
import type { Timestamp } from 'firebase/firestore'

function isTimestampDueToday(deadlineAt?: Timestamp): boolean {
  if (!deadlineAt) return false
  const d = deadlineAt.toDate()
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function isProjectDueToday(project: Project): boolean {
  return isTimestampDueToday(project.deadlineAt)
}

/** Personal “Your work” sub-tabs (Tasks hub). */
export type PersonalWorkTab =
  | 'mine'
  | 'created'
  | 'forwarded'
  | 'completed'
  | 'overdue'
  | 'today'

export function isPersonalWorkTab(tab: string): tab is PersonalWorkTab {
  return (
    tab === 'mine' ||
    tab === 'created' ||
    tab === 'forwarded' ||
    tab === 'completed' ||
    tab === 'overdue' ||
    tab === 'today'
  )
}

/**
 * Client-side filters for tasks already loaded from the tab’s Firestore subscription.
 * - mine / completed / overdue / today: current assignee only
 * - created: creator only
 * - forwarded: tasks you forwarded (`forwardedByIds`)
 */
export function filterTasksForPersonalTab(
  tasks: Task[],
  tab: PersonalWorkTab,
  userId: string,
): Task[] {
  switch (tab) {
    case 'mine':
      return tasks.filter(
        (t) => t.assigneeIds.includes(userId) && isTaskPending(t),
      )
    case 'created':
      return tasks.filter((t) => t.createdBy === userId)
    case 'forwarded':
      return tasks.filter((t) => t.forwardedByIds?.includes(userId))
    case 'completed':
      return tasks.filter(
        (t) => t.assigneeIds.includes(userId) && t.status === 'completed',
      )
    case 'overdue':
      return tasks.filter(
        (t) => t.assigneeIds.includes(userId) && isTaskOverdue(t),
      )
    case 'today':
      return filterTasksDueTodayScope(tasks, userId)
    default:
      return tasks
  }
}

/** Projects shown for the active personal tab (tasks hub). */
export function filterProjectsForPersonalTab(
  projects: Project[],
  tab: PersonalWorkTab,
  userId: string,
  taskProjectIds: Set<string>,
): Project[] {
  if (tab === 'created') {
    return projects.filter((p) => p.createdBy === userId)
  }
  if (tab === 'today') {
    return filterProjectsDueTodayScope(projects, taskProjectIds)
  }
  return projects.filter((p) => taskProjectIds.has(p.id))
}

/** Assignee tasks due today (personal shortcut). */
export function filterTasksDueTodayScope(tasks: Task[], userId: string): Task[] {
  return tasks.filter((t) => t.assigneeIds.includes(userId) && isTaskDueToday(t))
}

/** Due-today overlay on an already-scoped task list. */
export function filterTasksDueToday(tasks: Task[]): Task[] {
  return tasks.filter((t) => isTaskDueToday(t))
}

/** Projects due today or tied to a due-today task in this view. */
export function filterProjectsDueTodayScope(
  projects: Project[],
  taskProjectIds: Set<string>,
): Project[] {
  return projects.filter((p) => isProjectDueToday(p) || taskProjectIds.has(p.id))
}
