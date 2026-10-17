import { describe, expect, it } from 'vitest'
import { notificationAction, notificationHeading } from '@/lib/notifications/notificationCta'
import type { AppNotification } from '@/types'

function n(type: AppNotification['type'], entityId = 'task-1'): AppNotification {
  return {
    id: 'n1',
    recipientId: 'u1',
    type,
    title: 'Title',
    body: 'Body text',
    entityType: 'task',
    entityId,
    readAt: null,
  }
}

describe('notificationAction', () => {
  it('maps task_assigned to View Task', () => {
    const a = notificationAction(n('task_assigned'))
    expect(a).toEqual({ label: 'View Task', to: '/tasks/task-1' })
  })

  it('maps task_overdue to Review Task', () => {
    const a = notificationAction(n('task_overdue'))
    expect(a?.label).toBe('Review Task')
  })

  it('uses friendly heading for assigned', () => {
    expect(notificationHeading(n('task_assigned'))).toContain('new task')
  })
})
