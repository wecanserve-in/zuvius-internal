export type UserRole = 'super_admin' | 'admin' | 'department_admin' | 'member'

const hierarchy: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  department_admin: 2,
  member: 1,
}

export function hasMinRole(role: UserRole, min: UserRole): boolean {
  return hierarchy[role] >= hierarchy[min]
}
