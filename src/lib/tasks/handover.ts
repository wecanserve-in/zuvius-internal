import { isEligibleForwardRecipient } from '@/lib/permissions/forwarding'
import type { AppUser, Task, TaskStatus, AssigneeStatus } from '@/types'

const NON_FORWARDABLE: TaskStatus[] = ['completed', 'cancelled']

export function canForwardTask(
  actor: AppUser,
  task: Task,
  myAssigneeStatus?: AssigneeStatus,
): boolean {
  if (!actor.isActive) return false
  if (!task.assigneeIds.includes(actor.id)) return false
  if (NON_FORWARDABLE.includes(task.status)) return false
  if (myAssigneeStatus === 'completed') return false
  return true
}

export function validateHandoverNote(note: string): string {
  const trimmed = note.trim()
  if (trimmed.length < 3) {
    throw new Error('Handover note is required (at least 3 characters).')
  }
  if (trimmed.length > 4000) {
    throw new Error('Handover note is too long.')
  }
  return trimmed
}

export function buildHandoverAssigneeIds(
  currentAssigneeIds: string[],
  fromUserId: string,
  toUserId: string,
): string[] {
  if (fromUserId === toUserId) {
    throw new Error('You cannot forward a task to yourself.')
  }
  if (!currentAssigneeIds.includes(fromUserId)) {
    throw new Error('You are not assigned to this task.')
  }
  const withoutFrom = currentAssigneeIds.filter((id) => id !== fromUserId)
  if (withoutFrom.includes(toUserId)) {
    return withoutFrom
  }
  return [...withoutFrom, toUserId]
}

/** @deprecated use isEligibleForwardRecipient from permissions/forwarding */
export function canReceiveForwardedTask(user: AppUser, fromUserId: string): boolean {
  return isEligibleForwardRecipient(user, fromUserId)
}

export function listEligibleForwardTargets(
  actor: AppUser,
  _task: Task,
  users: AppUser[],
): AppUser[] {
  return users
    .filter((u) => isEligibleForwardRecipient(u, actor.id))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}
