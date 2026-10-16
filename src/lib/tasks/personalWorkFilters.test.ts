import { describe, expect, it } from 'vitest'
import { filterTasksForPersonalTab } from '@/lib/tasks/personalWorkFilters'
import type { Task } from '@/types'

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    title: 'T',
    description: '',
    createdBy: 'creator',
    assigneeIds: ['u1'],
    priority: 'medium',
    status: 'todo',
    requiresReview: false,
    ...partial,
  }
}

describe('filterTasksForPersonalTab', () => {
  const uid = 'u1'

  it('mine: assignee and not completed/cancelled', () => {
    const tasks = [
      task({ id: 'a', assigneeIds: [uid], status: 'todo' }),
      task({ id: 'b', assigneeIds: [uid], status: 'completed' }),
      task({ id: 'c', assigneeIds: ['other'], status: 'todo' }),
    ]
    expect(filterTasksForPersonalTab(tasks, 'mine', uid).map((t) => t.id)).toEqual(['a'])
  })

  it('created: only tasks created by user', () => {
    const tasks = [
      task({ id: 'a', createdBy: uid }),
      task({ id: 'b', createdBy: 'other' }),
    ]
    expect(filterTasksForPersonalTab(tasks, 'created', uid).map((t) => t.id)).toEqual(['a'])
  })

  it('forwarded: only tasks where user is in forwardedByIds', () => {
    const tasks = [
      task({ id: 'a', forwardedByIds: [uid], formerAssigneeIds: [uid] }),
      task({ id: 'b', formerAssigneeIds: [uid] }),
      task({ id: 'c', forwardedByIds: ['other'] }),
    ]
    expect(filterTasksForPersonalTab(tasks, 'forwarded', uid).map((t) => t.id)).toEqual(['a'])
  })
})
