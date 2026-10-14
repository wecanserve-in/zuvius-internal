import { isEligibleForwardRecipient, isEligibleTaskAssignee } from '@/lib/permissions/forwarding'
import type { AppUser, Department } from '@/types'

export function departmentLabelForUser(
  user: AppUser,
  deptById: Map<string, Department>,
): string {
  if (!user.departmentIds.length) return 'No department'
  return user.departmentIds
    .map((id) => deptById.get(id)?.name ?? id)
    .join(', ')
}

export function formatOrgMemberOption(
  user: AppUser,
  deptById: Map<string, Department>,
): string {
  const dept = departmentLabelForUser(user, deptById)
  const role = user.role.replace(/_/g, ' ')
  return `${user.displayName}\n${dept} · ${role}`
}

export function filterForwardCandidates(
  actor: AppUser,
  users: AppUser[],
): AppUser[] {
  return users
    .filter((u) => isEligibleForwardRecipient(u, actor.id))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export function filterAssigneeCandidates(
  actor: AppUser,
  users: AppUser[],
): AppUser[] {
  return users
    .filter((u) => isEligibleTaskAssignee(u, actor.id))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}
