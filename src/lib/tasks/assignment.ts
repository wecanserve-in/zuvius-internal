import { canAssignTaskToUser } from '@/lib/permissions'
import type { AppUser } from '@/types'

/** Active users eligible for assignment in a department (excludes org admins). */
export function filterEligibleAssignees(
  users: AppUser[],
  departmentId: string,
): AppUser[] {
  return users
    .filter((u) => canAssignTaskToUser(u, departmentId))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/** Merge eligible assignees across multiple managed departments (unique by user id). */
export function filterEligibleAssigneesForDepartments(
  users: AppUser[],
  departmentIds: string[],
): AppUser[] {
  const byId = new Map<string, AppUser>()
  for (const deptId of departmentIds) {
    for (const u of filterEligibleAssignees(users, deptId)) {
      byId.set(u.id, u)
    }
  }
  return [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/**
 * Resolves the task department when the creator manages multiple departments.
 * All assignees must belong to the same authorized department.
 */
export function resolveTaskDepartmentId(
  assignees: AppUser[],
  allowedDepartmentIds: string[],
): string {
  if (assignees.length === 0) {
    throw new Error('Select at least one assignee')
  }
  if (allowedDepartmentIds.length === 1) {
    const deptId = allowedDepartmentIds[0]
    const ok = assignees.every((u) => canAssignTaskToUser(u, deptId))
    if (!ok) {
      throw new Error('One or more assignees are not eligible for this department')
    }
    return deptId
  }

  const allowed = new Set(allowedDepartmentIds)
  let intersection: string[] | null = null
  for (const u of assignees) {
    const depts = u.departmentIds.filter((id) => allowed.has(id))
    if (intersection === null) {
      intersection = depts
    } else {
      intersection = intersection.filter((id) => depts.includes(id))
    }
  }
  const candidates = (intersection ?? []).filter((deptId) =>
    assignees.every((u) => canAssignTaskToUser(u, deptId)),
  )
  if (candidates.length !== 1) {
    throw new Error(
      'All assignees must belong to the same department. Select members from one department only.',
    )
  }
  return candidates[0]
}
