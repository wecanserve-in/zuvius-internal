import { describe, expect, it } from 'vitest'
import { sortTasksForDisplay } from '@/lib/tasks/sortTasks'
import type { Task } from '@/types'

function task(partial: Partial<Task> & Pick<Task, 'id' | 'status' | 'priority'>): Task {
  return {
    title: 'T',
    description: '',
    createdBy: 'c',
    assigneeIds: ['u'],
    requiresReview: false,
    ...partial,
  }
}

describe('sortTasksForDisplay', () => {
  it('lists pending tasks before completed', () => {
    const open = task({ id: 'open', status: 'todo', priority: 'low' })
    const done = task({ id: 'done', status: 'completed', priority: 'urgent' })
    const sorted = sortTasksForDisplay([done, open])
    expect(sorted.map((t) => t.id)).toEqual(['open', 'done'])
  })

  it('sorts open tasks by priority when both pending', () => {
    const low = task({ id: 'low', status: 'todo', priority: 'low' })
    const high = task({ id: 'high', status: 'in_progress', priority: 'high' })
    const med = task({ id: 'med', status: 'todo', priority: 'medium' })
    const sorted = sortTasksForDisplay([low, med, high])
    expect(sorted.map((t) => t.id)).toEqual(['high', 'med', 'low'])
  })
})
