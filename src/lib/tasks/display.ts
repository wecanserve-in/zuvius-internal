import { formatUserRole } from '@/lib/permissions'
import type { AppUser, Department, Task, TaskHistoryEvent } from '@/types'

export interface TaskDisplayContext {
  creatorId: string
  creatorLabel: string
  createdAtLabel?: string
  originalAssigneeIds: string[]
  originalAssigneeLabel: string
  currentAssigneeIds: string[]
  currentAssigneeLabel: string
  currentAssigneeDepartmentLabel?: string
  assignedByLabel?: string
  lastForwardedById?: string
  lastForwardedByLabel?: string
  lastHandoverNote?: string
  previousAssigneeIds: string[]
  wasForwarded: boolean
}

function userLabel(id: string, usersById: Map<string, AppUser>): string {
  const u = usersById.get(id)
  if (!u) return 'Unknown user'
  const role = formatUserRole(u.role)
  return `${u.displayName} (${role})`
}

function usersLabel(ids: string[], usersById: Map<string, AppUser>): string {
  if (ids.length === 0) return '—'
  return ids.map((id) => userLabel(id, usersById)).join(', ')
}

function departmentLabelForUser(
  user: AppUser | undefined,
  deptById: Map<string, Department>,
): string | undefined {
  if (!user?.departmentIds.length) return undefined
  const names = user.departmentIds
    .map((id) => deptById.get(id)?.name ?? id)
    .filter(Boolean)
  return names.length ? names.join(', ') : undefined
}

export function deriveTaskDisplayContext(
  task: Task,
  history: TaskHistoryEvent[],
  usersById: Map<string, AppUser>,
  deptById: Map<string, Department>,
): TaskDisplayContext {
  const createdEvent = history.find((e) => e.kind === 'created')
  const forwardEvents = history.filter((e) => e.kind === 'forwarded')
  const lastForward = forwardEvents.length > 0 ? forwardEvents[forwardEvents.length - 1] : undefined

  const originalAssigneeIds =
    task.initialAssigneeIds ??
    createdEvent?.assigneeIds ??
    (lastForward?.previousAssigneeId ? [lastForward.previousAssigneeId] : task.assigneeIds)

  const creatorId = task.createdBy
  const creator = usersById.get(creatorId)
  const creatorLabel = creator
    ? `${creator.displayName} (${formatUserRole(creator.role)})`
    : userLabel(creatorId, usersById)

  const currentPrimary = task.assigneeIds[0]
  const currentUser = currentPrimary ? usersById.get(currentPrimary) : undefined

  const assignedById = createdEvent?.assignedById ?? createdEvent?.actorId ?? task.createdBy
  const assignedBy = usersById.get(assignedById)

  return {
    creatorId,
    creatorLabel,
    createdAtLabel: task.createdAt ? task.createdAt.toDate().toISOString() : undefined,
    originalAssigneeIds,
    originalAssigneeLabel: usersLabel(originalAssigneeIds, usersById),
    currentAssigneeIds: task.assigneeIds,
    currentAssigneeLabel: usersLabel(task.assigneeIds, usersById),
    currentAssigneeDepartmentLabel: departmentLabelForUser(currentUser, deptById),
    assignedByLabel: assignedBy
      ? `${assignedBy.displayName} (${formatUserRole(assignedBy.role)})`
      : undefined,
    lastForwardedById: lastForward?.actorId,
    lastForwardedByLabel: lastForward?.actorId
      ? userLabel(lastForward.actorId, usersById)
      : undefined,
    lastHandoverNote: lastForward?.handoverNote,
    previousAssigneeIds: task.formerAssigneeIds ?? [],
    wasForwarded: forwardEvents.length > 0,
  }
}
