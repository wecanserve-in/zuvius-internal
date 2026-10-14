import { describe, expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { mergeTasksByUpdatedAt } from '@/lib/tasks/mergeTasks'
import type { Task } from '@/types'

function task(id: string, assigneeIds: string[], updatedMs: number): Task {
  return {
    id,
    title: id,
    description: '',
    createdBy: 'c1',
    departmentId: 'dept-a',
    assigneeIds,
    initialAssigneeIds: assigneeIds,
    status: 'todo',
    priority: 'medium',
    requiresReview: false,
    updatedAt: Timestamp.fromMillis(updatedMs),
  }
}

describe('mergeTasksByUpdatedAt', () => {
  it('merges assignee and department subscriptions without duplicates', () => {
    const assigned = [task('t1', ['anuj'], 100)]
    const departmental = [task('t1', ['anuj'], 200), task('t2', ['other'], 150)]
    const merged = mergeTasksByUpdatedAt([assigned, departmental])
    expect(merged.map((t) => t.id)).toEqual(['t1', 't2'])
    expect(merged[0]?.updatedAt?.toMillis()).toBe(200)
  })

  it('includes cross-department assignments only present on assignee query', () => {
    const assigned = [task('forwarded', ['anuj'], 300)]
    const departmental = [task('local', ['member'], 100)]
    const merged = mergeTasksByUpdatedAt([assigned, departmental])
    expect(merged.map((t) => t.id).sort()).toEqual(['forwarded', 'local'])
  })
})
