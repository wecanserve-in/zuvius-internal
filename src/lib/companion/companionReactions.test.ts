import { describe, expect, it, beforeEach } from 'vitest'
import { reactionsFromTaskTransitions } from '@/lib/companion/companionReactions'
import type { Task } from '@/types'

function task(partial: Partial<Task> & Pick<Task, 'id' | 'assigneeIds' | 'status'>): Task {
  return {
    title: 'Ship report',
    description: '',
    createdBy: 'c1',
    priority: 'medium',
    requiresReview: false,
    ...partial,
  }
}

describe('reactionsFromTaskTransitions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('does not fire assignment reactions on initial hydration', () => {
    const tasks = [task({ id: 'a', assigneeIds: ['u1'], status: 'todo' })]
    const { reactions, next } = reactionsFromTaskTransitions(tasks, 'u1', {
      status: new Map(),
      hydrated: false,
    })
    expect(reactions).toHaveLength(0)
    expect(next.hydrated).toBe(true)
  })

  it('fires assignment when a new pending task appears after hydration', () => {
    const snap = { status: new Map([['a', 'todo']]), hydrated: true }
    const tasks = [
      task({ id: 'a', assigneeIds: ['u1'], status: 'todo' }),
      task({ id: 'b', assigneeIds: ['u1'], status: 'todo' }),
    ]
    const { reactions } = reactionsFromTaskTransitions(tasks, 'u1', snap)
    expect(reactions.some((r) => r.kind === 'assigned' && r.to === '/tasks/b')).toBe(true)
  })
})
