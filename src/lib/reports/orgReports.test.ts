import { describe, expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import {
  computeEmployeeLeaderboard,
  computeOrgTaskSummary,
  filterTasksByRange,
} from '@/lib/reports/orgReports'
import type { Task } from '@/types'

function task(partial: Partial<Task> & Pick<Task, 'id' | 'status'>): Task {
  return {
    title: partial.id,
    description: '',
    createdBy: 'c',
    assigneeIds: ['a'],
    priority: 'medium',
    requiresReview: false,
    ...partial,
  }
}

describe('orgReports', () => {
  it('summarises completed and overdue without double counting', () => {
    const tasks = [
      task({ id: '1', status: 'completed' }),
      task({ id: '2', status: 'todo' }),
      task({
        id: '3',
        status: 'in_progress',
        deadlineAt: Timestamp.fromMillis(Date.now() - 86400000),
      }),
    ]
    const s = computeOrgTaskSummary(tasks)
    expect(s.total).toBe(3)
    expect(s.completed).toBe(1)
    expect(s.pendingOrActive).toBe(2)
    expect(s.overdue).toBe(1)
  })

  it('filters by updated timestamp for range', () => {
    const old = task({
      id: 'old',
      status: 'todo',
      updatedAt: Timestamp.fromMillis(Date.now() - 40 * 86400000),
    })
    const recent = task({
      id: 'new',
      status: 'todo',
      updatedAt: Timestamp.fromMillis(Date.now() - 86400000),
    })
    const filtered = filterTasksByRange([old, recent], '7d')
    expect(filtered.map((t) => t.id)).toEqual(['new'])
  })

  it('ranks employees by on-time completions and penalises overdue', () => {
    const now = Date.now()
    const tasks = [
      task({
        id: 'a',
        status: 'completed',
        assigneeIds: ['alice'],
        completedAt: Timestamp.fromMillis(now - 1000),
        deadlineAt: Timestamp.fromMillis(now + 86400000),
      }),
      task({
        id: 'b',
        status: 'todo',
        assigneeIds: ['bob'],
        deadlineAt: Timestamp.fromMillis(now - 86400000),
      }),
    ]
    const board = computeEmployeeLeaderboard(tasks, 5)
    expect(board[0]?.userId).toBe('alice')
    expect(board.find((r) => r.userId === 'bob')).toBeUndefined()
  })
})
