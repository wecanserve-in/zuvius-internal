import { describe, expect, it } from 'vitest'
import { filterNotifications, notificationCategory } from '@/lib/notifications/inbox'
import type { AppNotification } from '@/types'

function n(type: AppNotification['type'], read = false): AppNotification {
  return {
    id: `${type}-${read}`,
    recipientId: 'u1',
    type,
    title: 'T',
    body: 'Body',
    readAt: read ? ({} as AppNotification['readAt']) : null,
  }
}

describe('notification inbox filters', () => {
  it('categorises task types', () => {
    expect(notificationCategory('task_forwarded')).toBe('tasks')
    expect(notificationCategory('message_direct')).toBe('messages')
    expect(notificationCategory('admin_change')).toBe('other')
  })

  it('filters unread only', () => {
    const items = [n('task_forwarded', false), n('task_completed', true)]
    expect(filterNotifications(items, 'unread')).toHaveLength(1)
  })
})
