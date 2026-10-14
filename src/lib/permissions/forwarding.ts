import type { AppUser, Task } from '@/types'

/**
 * Current assignee may load the organisation directory only to forward a task they own.
 * Does not grant task management or admin capabilities.
 */
export function canLoadForwardRecipientDirectory(
  actor: AppUser,
  task: Task,
): boolean {
  if (!actor.isActive) return false
  if (!task.assigneeIds.includes(actor.id)) return false
  if (task.status === 'completed' || task.status === 'cancelled') return false
  return true
}

/** Active colleague eligible to receive a forwarded task (org-wide). */
export function isEligibleForwardRecipient(
  candidate: AppUser,
  forwarderId: string,
): boolean {
  if (!candidate.isActive) return false
  if (candidate.id === forwarderId) return false
  // Operational handover — not to org-wide admin accounts (use task reassignment flows).
  if (candidate.role === 'admin' || candidate.role === 'super_admin') return false
  return true
}

/** Active colleague eligible when creating or assigning a task (org-wide). */
export function isEligibleTaskAssignee(candidate: AppUser, creatorId: string): boolean {
  if (!candidate.isActive) return false
  if (candidate.id === creatorId) return false
  return true
}
