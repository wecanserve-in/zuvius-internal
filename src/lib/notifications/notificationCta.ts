import { notificationDestination } from '@/lib/notifications/inbox'
import { COMPANION_ROUTES, projectDetailPath, taskDetailPath } from '@/lib/companion/companionRoutes'
import type { AppNotification } from '@/types'

export interface NotificationAction {
  label: string
  to: string
}

export function notificationAction(notification: AppNotification): NotificationAction | null {
  if (notification.entityType === 'task' && notification.entityId) {
    const to = taskDetailPath(notification.entityId)
    switch (notification.type) {
      case 'task_assigned':
      case 'task_reassigned':
      case 'task_forwarded':
        return { label: 'View Task', to }
      case 'task_completed':
        return { label: 'View Completed Task', to }
      case 'task_revision':
        return { label: 'Review Task', to }
      case 'task_deadline':
        return { label: 'View Task', to }
      case 'task_overdue':
        return { label: 'Review Task', to }
      default:
        return { label: 'View Task', to }
    }
  }

  if (notification.entityType === 'conversation' && notification.entityId) {
    const isTaskChat = notification.entityId.startsWith('task-')
    const label =
      notification.type === 'message_direct' || notification.type === 'message_group'
        ? isTaskChat
          ? 'Open Task Chat'
          : 'Open Chat'
        : 'Open Chat'
    return { label, to: `/messages/${notification.entityId}` }
  }

  const dest = notificationDestination(notification)
  if (dest) {
    return { label: 'Open', to: dest }
  }

  if (notification.entityType === 'user' && notification.entityId) {
    return { label: 'View Profile', to: `/team/${notification.entityId}` }
  }

  return null
}

/** Heading copy for companion / inbox when type-specific title is preferred. */
export function notificationHeading(notification: AppNotification): string {
  switch (notification.type) {
    case 'task_assigned':
      return "Boss Baby says: You've got a new task!"
    case 'task_reassigned':
    case 'task_forwarded':
      return 'A task has been assigned to you.'
    case 'task_deadline':
      return 'Heads up! A task deadline is approaching.'
    case 'task_overdue':
      return "Boss Baby says: We've got some catching up to do!"
    case 'task_completed':
      return 'Nice work! A task was completed.'
    case 'task_revision':
      return 'Task needs your attention.'
    default:
      return notification.title
  }
}

export function notificationFallbackListRoute(type: AppNotification['type']): string | null {
  if (type === 'task_overdue') return COMPANION_ROUTES.tasksOverdue
  if (type === 'task_deadline') return COMPANION_ROUTES.tasksToday
  return COMPANION_ROUTES.tasksMine
}

export function projectNotificationAction(projectId: string): NotificationAction {
  return { label: 'View Project', to: projectDetailPath(projectId) }
}
