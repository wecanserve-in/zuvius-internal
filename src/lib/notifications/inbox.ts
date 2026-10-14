import { isToday, isYesterday } from 'date-fns'
import type { AppNotification, NotificationType } from '@/types'

export type NotificationFilter = 'all' | 'unread' | 'tasks' | 'messages' | 'other'

const TASK_TYPES: NotificationType[] = [
  'task_assigned',
  'task_reassigned',
  'task_forwarded',
  'task_completed',
  'task_revision',
  'task_deadline',
  'task_overdue',
]

const MESSAGE_TYPES: NotificationType[] = ['message_direct', 'message_group']

export function notificationCategory(type: NotificationType): NotificationFilter {
  if (TASK_TYPES.includes(type)) return 'tasks'
  if (MESSAGE_TYPES.includes(type)) return 'messages'
  return 'other'
}

export function filterNotifications(
  items: AppNotification[],
  filter: NotificationFilter,
): AppNotification[] {
  if (filter === 'all') return items
  if (filter === 'unread') return items.filter((n) => !n.readAt)
  return items.filter((n) => notificationCategory(n.type) === filter)
}

export function notificationDestination(n: AppNotification): string | null {
  if (n.entityType === 'task' && n.entityId) return `/tasks/${n.entityId}`
  if (n.entityType === 'conversation' && n.entityId) return `/messages/${n.entityId}`
  return null
}

export type DateGroup = 'today' | 'yesterday' | 'earlier'

export function notificationDateGroup(n: AppNotification): DateGroup {
  if (!n.createdAt) return 'earlier'
  const d = n.createdAt.toDate()
  if (isToday(d)) return 'today'
  if (isYesterday(d)) return 'yesterday'
  return 'earlier'
}

export function groupNotificationsByDate(
  items: AppNotification[],
): { group: DateGroup; label: string; items: AppNotification[] }[] {
  const order: DateGroup[] = ['today', 'yesterday', 'earlier']
  const labels: Record<DateGroup, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    earlier: 'Earlier',
  }
  const buckets = new Map<DateGroup, AppNotification[]>()
  for (const g of order) buckets.set(g, [])
  for (const n of items) {
    buckets.get(notificationDateGroup(n))!.push(n)
  }
  return order
    .map((group) => ({
      group,
      label: labels[group],
      items: buckets.get(group) ?? [],
    }))
    .filter((section) => section.items.length > 0)
}

/** Best-effort actor label from notification body (e.g. "Adnan forwarded …"). */
export function actorHintFromBody(body: string): string | null {
  const m = body.match(/^([^:]+?)\s+(forwarded|marked|assigned|completed|sent)/i)
  if (!m) return null
  const name = m[1].trim()
  return name.length > 0 && name.length < 80 ? name : null
}
