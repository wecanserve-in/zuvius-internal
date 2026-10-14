import { describe, expect, it } from 'vitest'
import {
  canAccessTask,
  canAssignTaskToUser,
  canChangeRole,
  canManageUsers,
  hasMinRole,
} from '@/lib/permissions'
import type { AppUser } from '@/types'

const baseUser = (overrides: Partial<AppUser>): AppUser => ({
  id: 'u1',
  displayName: 'Test',
  email: 'test@zuvius.com',
  departmentIds: ['d1'],
  role: 'member',
  isActive: true,
  ...overrides,
})

describe('permissions', () => {
  it('enforces role hierarchy', () => {
    expect(hasMinRole(baseUser({ role: 'admin' }), 'department_admin')).toBe(true)
    expect(hasMinRole(baseUser({ role: 'member' }), 'admin')).toBe(false)
    expect(hasMinRole(baseUser({ isActive: false }), 'member')).toBe(false)
  })

  it('restricts user management to admin+', () => {
    expect(canManageUsers(baseUser({ role: 'admin' }))).toBe(true)
    expect(canManageUsers(baseUser({ role: 'department_admin' }))).toBe(false)
  })

  it('restricts super admin promotion', () => {
    expect(canChangeRole(baseUser({ role: 'super_admin' }), 'super_admin')).toBe(true)
    expect(canChangeRole(baseUser({ role: 'admin' }), 'super_admin')).toBe(false)
  })

  it('blocks assigning org admins through department task flow', () => {
    const member = baseUser({ role: 'member', departmentIds: ['d1'] })
    const admin = baseUser({ role: 'admin', departmentIds: ['d1'] })
    expect(canAssignTaskToUser(member, 'd1')).toBe(true)
    expect(canAssignTaskToUser(admin, 'd1')).toBe(false)
  })

  it('scopes task access by assignee and department', () => {
    const member = baseUser({ role: 'member', id: 'm1' })
    const deptAdmin = baseUser({ role: 'department_admin', departmentIds: ['d1'] })
    const task = {
      createdBy: 'x',
      assigneeIds: ['m1'],
      departmentId: 'd1',
    }
    expect(canAccessTask(member, task)).toBe(true)
    expect(canAccessTask(deptAdmin, task)).toBe(true)
    expect(
      canAccessTask(baseUser({ role: 'member', id: 'other' }), task),
    ).toBe(false)
  })
})
