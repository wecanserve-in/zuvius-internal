import { describe, expect, it } from 'vitest'
import {
  buildHandoverAssigneeIds,
  canForwardTask,
  listEligibleForwardTargets,
  validateHandoverNote,
} from '@/lib/tasks/handover'
import type { AppUser, Task } from '@/types'

const member = (id: string): AppUser => ({
  id,
  displayName: id,
  email: `${id}@test.com`,
  departmentIds: ['d1'],
  role: 'member',
  isActive: true,
})

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'T',
  description: '',
  createdBy: 'mgr',
  departmentId: 'd1',
  assigneeIds: ['a'],
  priority: 'medium',
  status: 'todo',
  requiresReview: false,
  ...overrides,
})

describe('handover', () => {
  it('rejects empty notes', () => {
    expect(() => validateHandoverNote('  ')).toThrow(/required/i)
  })

  it('allows forward for active assignee', () => {
    expect(canForwardTask(member('a'), task())).toBe(true)
    expect(canForwardTask(member('b'), task())).toBe(false)
    expect(canForwardTask(member('a'), task({ status: 'completed' }))).toBe(false)
    expect(canForwardTask(member('a'), task(), 'completed')).toBe(false)
  })

  it('swaps assignee in list', () => {
    expect(buildHandoverAssigneeIds(['a'], 'a', 'b')).toEqual(['b'])
    expect(buildHandoverAssigneeIds(['a', 'c'], 'a', 'b')).toEqual(['c', 'b'])
  })

  it('rejects self-forward', () => {
    expect(() => buildHandoverAssigneeIds(['a'], 'a', 'a')).toThrow(/yourself/i)
  })

  it('lists all active colleagues except the forwarder', () => {
    const actor = member('a')
    const users = [
      actor,
      member('b'),
      { ...member('c'), departmentIds: ['other'] },
      { ...member('off'), isActive: false },
    ]
    const ids = listEligibleForwardTargets(actor, task(), users).map((u) => u.id)
    expect(ids).toEqual(['b', 'c'])
  })
})
