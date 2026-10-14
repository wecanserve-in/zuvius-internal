import { describe, expect, it } from 'vitest'
import { deriveTaskDisplayContext } from '@/lib/tasks/display'
import type { AppUser, Task, TaskHistoryEvent } from '@/types'

const user = (id: string, name: string, role: AppUser['role'] = 'member'): AppUser => ({
  id,
  displayName: name,
  email: `${id}@test.com`,
  departmentIds: ['sales'],
  role,
  isActive: true,
})

describe('deriveTaskDisplayContext', () => {
  it('keeps original creator after forward', () => {
    const task: Task = {
      id: 't1',
      title: 'T',
      description: '',
      createdBy: 'mgr',
      departmentId: 'sales',
      assigneeIds: ['mkt'],
      initialAssigneeIds: ['sales-admin'],
      formerAssigneeIds: ['sales-admin'],
      priority: 'medium',
      status: 'in_progress',
      requiresReview: false,
    }
    const history: TaskHistoryEvent[] = [
      {
        id: 'created',
        taskId: 't1',
        kind: 'created',
        actorId: 'mgr',
        assignedById: 'mgr',
        assigneeIds: ['sales-admin'],
      },
      {
        id: 'f1',
        taskId: 't1',
        kind: 'forwarded',
        actorId: 'sales-admin',
        previousAssigneeId: 'sales-admin',
        newAssigneeId: 'mkt',
        handoverNote: 'Please take over',
      },
    ]
    const users = new Map([
      ['mgr', user('mgr', 'Manager', 'admin')],
      ['sales-admin', user('sales-admin', 'Sales Admin', 'department_admin')],
      ['mkt', user('mkt', 'Marketer')],
    ])
    const ctx = deriveTaskDisplayContext(task, history, users, new Map([['sales', { id: 'sales', name: 'Sales', adminIds: [], memberIds: [] }]]))
    expect(ctx.creatorId).toBe('mgr')
    expect(ctx.creatorLabel).toContain('Manager')
    expect(ctx.originalAssigneeLabel).toContain('Sales Admin')
    expect(ctx.currentAssigneeLabel).toContain('Marketer')
    expect(ctx.lastHandoverNote).toBe('Please take over')
    expect(ctx.wasForwarded).toBe(true)
  })
})
