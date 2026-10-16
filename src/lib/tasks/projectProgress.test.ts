import { describe, expect, it } from 'vitest'
import { projectProgressPercent } from '@/lib/tasks/projectProgress'
import type { Task } from '@/types'

const task = (status: Task['status']): Task => ({
  id: 't',
  title: 'x',
  description: '',
  createdBy: 'u',
  assigneeIds: ['u'],
  priority: 'medium',
  status,
  requiresReview: false,
})

describe('projectProgressPercent', () => {
  it('returns 0 for empty lists', () => {
    expect(projectProgressPercent([])).toBe(0)
  })

  it('counts completed tasks', () => {
    expect(
      projectProgressPercent([task('completed'), task('todo'), task('completed')]),
    ).toBe(67)
  })
})
