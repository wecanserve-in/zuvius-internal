import { describe, expect, it } from 'vitest'
import {
  filterEligibleAssignees,
  resolveTaskDepartmentId,
} from '@/lib/tasks/assignment'
import type { AppUser } from '@/types'

const user = (overrides: Partial<AppUser>): AppUser => ({
  id: 'u1',
  displayName: 'User',
  email: 'u@z.com',
  departmentIds: ['d1'],
  role: 'member',
  isActive: true,
  ...overrides,
})

describe('task assignment helpers', () => {
  it('excludes org admins from eligible assignees', () => {
    const members = [
      user({ id: 'm1', role: 'member' }),
      user({ id: 'a1', role: 'admin' }),
      user({ id: 's1', role: 'super_admin' }),
      user({ id: 'i1', isActive: false }),
    ]
    const eligible = filterEligibleAssignees(members, 'd1')
    expect(eligible.map((u) => u.id)).toEqual(['m1'])
  })

  it('uses single managed department automatically', () => {
    const assignees = [user({ id: 'm1' }), user({ id: 'm2', departmentIds: ['d1'] })]
    expect(resolveTaskDepartmentId(assignees, ['d1'])).toBe('d1')
  })

  it('requires a single shared department when creator manages multiple', () => {
    const a = user({ id: 'a', departmentIds: ['sales'] })
    const b = user({ id: 'b', departmentIds: ['sales', 'proc'] })
    expect(resolveTaskDepartmentId([a, b], ['sales', 'proc'])).toBe('sales')

    const c = user({ id: 'c', departmentIds: ['proc'] })
    expect(() => resolveTaskDepartmentId([a, c], ['sales', 'proc'])).toThrow(
      /same department/i,
    )
  })
})
