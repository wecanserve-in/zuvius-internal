import { describe, expect, it } from 'vitest'
import { computeCompanionStats } from '@/lib/companion/companionStats'
import type { Task } from '@/types'

function task(partial: Partial<Task> & Pick<Task, 'id' | 'assigneeIds' | 'status'>): Task {
  return {
    title: 't',
    description: '',
    createdBy: 'c',
    priority: 'medium',
    requiresReview: false,
    ...partial,
  }
}

describe('computeCompanionStats', () => {
  it('counts pending assignee tasks and overdue', () => {
    const tasks = [
      task({ id: '1', assigneeIds: ['u1'], status: 'todo' }),
      task({
        id: '2',
        assigneeIds: ['u1'],
        status: 'in_progress',
        deadlineAt: { toDate: () => new Date(Date.now() - 86400000) } as Task['deadlineAt'],
      }),
    ]
    const stats = computeCompanionStats(tasks, 'u1')
    expect(stats.pendingCount).toBe(2)
    expect(stats.overdueCount).toBe(1)
  })
})
