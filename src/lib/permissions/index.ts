import type { AppUser, UserRole } from '@/types'

export function formatUserRole(role: UserRole): string {
  return role.replace(/_/g, ' ')
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  department_admin: 2,
  member: 1,
}

export function hasMinRole(user: AppUser | null | undefined, minRole: UserRole): boolean {
  if (!user?.isActive) return false
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minRole]
}

export function canManageUsers(user: AppUser | null | undefined): boolean {
  return hasMinRole(user, 'admin')
}

export function canManageDepartments(user: AppUser | null | undefined): boolean {
  return hasMinRole(user, 'admin')
}

export function canViewAllTasks(user: AppUser | null | undefined): boolean {
  return hasMinRole(user, 'admin')
}

export function canViewReports(user: AppUser | null | undefined): boolean {
  return hasMinRole(user, 'department_admin')
}

/** Any active employee may create and assign tasks organisation-wide. */
export function canCreateTasks(user: AppUser | null | undefined): boolean {
  return Boolean(user?.isActive)
}

/** @deprecated use canCreateTasks — kept for existing imports */
export function canAssignTasks(user: AppUser | null | undefined): boolean {
  return canCreateTasks(user)
}

/** Departments a department admin may manage (from profile, not name matching). */
export function managedDepartmentIds(user: AppUser | null | undefined): string[] {
  if (!user?.isActive) return []
  if (user.role === 'department_admin') return [...user.departmentIds]
  return []
}

export function isDepartmentAdminOnly(user: AppUser | null | undefined): boolean {
  return Boolean(user?.isActive && user.role === 'department_admin')
}

export function canViewDepartmentTasks(user: AppUser | null | undefined): boolean {
  return isDepartmentAdminOnly(user)
}

/** Active colleague eligible for task assignment (org-wide; includes org admins). */
export function canAssignTaskToUser(
  assignee: AppUser,
  departmentId: string,
): boolean {
  if (!assignee.isActive) return false
  if (assignee.role === 'admin' || assignee.role === 'super_admin') return true
  return assignee.departmentIds.includes(departmentId)
}

/** Tasks hub Overview tab (not shown to plain members). */
export function canViewTasksOverview(user: AppUser | null | undefined): boolean {
  if (!user?.isActive) return false
  if (user.role === 'member') return false
  return hasMinRole(user, 'department_admin')
}

export function canAccessProject(
  user: AppUser | null | undefined,
  project: { createdBy: string; departmentId?: string },
  options?: { assignedToProjectTask?: boolean },
): boolean {
  if (!user?.isActive) return false
  if (hasMinRole(user, 'admin')) return true
  if (project.createdBy === user.id) return true
  if (
    project.departmentId &&
    user.role === 'department_admin' &&
    user.departmentIds.includes(project.departmentId)
  ) {
    return true
  }
  if (options?.assignedToProjectTask) return true
  return false
}

export function userAssignedToProjectTasks(
  userId: string,
  projectId: string,
  tasks: { projectId?: string; assigneeIds: string[] }[],
): boolean {
  return tasks.some(
    (t) => t.projectId === projectId && t.assigneeIds.includes(userId),
  )
}

/** Who may append new tasks to an existing project (not assignee-only viewers). */
export function canAddTasksToProject(
  user: AppUser | null | undefined,
  project: { createdBy: string; departmentId?: string },
  tasks: { createdBy: string }[] = [],
): boolean {
  if (!canCreateTasks(user) || !user) return false
  if (hasMinRole(user, 'admin')) return true
  if (project.createdBy === user.id) return true
  if (
    project.departmentId &&
    user.role === 'department_admin' &&
    user.departmentIds.includes(project.departmentId)
  ) {
    return true
  }
  if (user.role === 'member' && tasks.some((t) => t.createdBy === user.id)) {
    return true
  }
  return false
}

/** Member who created the project (or its tasks) sees full project progress, not assignee-only. */
export function isMemberProjectOwner(
  user: AppUser | null | undefined,
  project: { createdBy: string },
  tasks: { createdBy: string }[] = [],
): boolean {
  if (!user?.isActive || user.role !== 'member') return false
  if (project.createdBy === user.id) return true
  return tasks.some((t) => t.createdBy === user.id)
}

export function canViewDepartmentMember(
  viewer: AppUser | null | undefined,
  member: AppUser,
): boolean {
  if (!viewer?.isActive) return false
  if (hasMinRole(viewer, 'admin')) return true
  if (viewer.role !== 'department_admin') return false
  return member.departmentIds.some((id) => viewer.departmentIds.includes(id))
}

export function canManageDepartment(
  user: AppUser | null | undefined,
  departmentId: string,
): boolean {
  if (!user?.isActive) return false
  if (hasMinRole(user, 'admin')) return true
  if (user.role === 'department_admin' && user.departmentIds.includes(departmentId)) {
    return true
  }
  return false
}

export function canParticipateInConversation(
  user: AppUser | null | undefined,
  memberIds: string[],
): boolean {
  if (!user?.isActive) return false
  return memberIds.includes(user.id)
}

/** Read / open thread (members + org admins for oversight). */
export function canViewConversation(
  user: AppUser | null | undefined,
  memberIds: string[],
): boolean {
  if (!user?.isActive) return false
  if (hasMinRole(user, 'admin')) return true
  return memberIds.includes(user.id)
}

/** @deprecated use canParticipateInConversation or canViewConversation */
export function canAccessConversation(
  user: AppUser | null | undefined,
  memberIds: string[],
): boolean {
  return canParticipateInConversation(user, memberIds)
}

export function canAccessDepartmentChat(
  user: AppUser | null | undefined,
  departmentId: string,
): boolean {
  if (!user?.isActive) return false
  if (hasMinRole(user, 'admin')) return true
  return user.departmentIds.includes(departmentId)
}

export function canManageDepartmentChat(
  user: AppUser | null | undefined,
  departmentId: string,
): boolean {
  if (!user?.isActive) return false
  if (hasMinRole(user, 'admin')) return true
  if (user.role === 'department_admin' && user.departmentIds.includes(departmentId)) {
    return true
  }
  return false
}

export function canDeleteTask(
  user: AppUser | null | undefined,
  task: { createdBy: string },
): boolean {
  if (!user?.isActive) return false
  if (hasMinRole(user, 'admin')) return true
  return task.createdBy === user.id
}

export function canAccessTask(
  user: AppUser | null | undefined,
  task: {
    createdBy: string
    assigneeIds: string[]
    departmentId?: string
    formerAssigneeIds?: string[]
  },
): boolean {
  if (!user?.isActive) return false
  if (hasMinRole(user, 'admin')) return true
  if (task.createdBy === user.id || task.assigneeIds.includes(user.id)) return true
  if (task.formerAssigneeIds?.includes(user.id)) return true
  if (
    task.departmentId &&
    user.role === 'department_admin' &&
    user.departmentIds.includes(task.departmentId)
  ) {
    return true
  }
  return false
}

export function canChangeRole(
  actor: AppUser | null | undefined,
  targetRole: UserRole,
): boolean {
  if (!actor?.isActive) return false
  if (targetRole === 'super_admin') {
    return actor.role === 'super_admin'
  }
  return hasMinRole(actor, 'admin')
}

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', minRole: 'member' as UserRole },
  { path: '/messages', label: 'Messages', minRole: 'member' as UserRole },
  { path: '/team', label: 'Team', minRole: 'admin' as UserRole },
  { path: '/departments', label: 'Departments', minRole: 'admin' as UserRole },
  { path: '/activity', label: 'Activity', minRole: 'department_admin' as UserRole },
  { path: '/reports', label: 'Reports', minRole: 'department_admin' as UserRole },
  { path: '/settings', label: 'Settings', minRole: 'member' as UserRole },
] as const

export function visibleNavItems(user: AppUser | null | undefined) {
  if (!user) return []
  return NAV_ITEMS.filter((item) => hasMinRole(user, item.minRole))
}
