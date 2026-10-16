import { isTaskDueToday, isTaskOverdue, isTaskPending } from '@/services/tasks.service'
import type { Project, Task } from '@/types'

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
      return tasks.filter(
        (t) => t.assigneeIds.includes(userId) && isTaskDueToday(t),
      )
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
  return projects.filter((p) => taskProjectIds.has(p.id))
}
