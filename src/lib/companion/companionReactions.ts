import { COMPANION_ROUTES, taskDetailPath } from '@/lib/companion/companionRoutes'
import {
  computeCompanionTaskLists,
  taskAlertTitle,
  taskDeadlineLabel,
} from '@/lib/companion/companionTaskLists'
import { hasShownReaction, markReactionShown, todayKey } from '@/lib/companion/companionReactionStore'
import { notificationAction } from '@/lib/notifications/notificationCta'
import type { AppNotification, Task } from '@/types'
import { isTaskDueToday, isTaskPending } from '@/services/tasks.service'

export type ReactionKind =
  | 'assigned'
  | 'message'
  | 'celebrate'
  | 'concerned'
  | 'overdue'
  | 'relaxed'
  | 'idle'

export interface CompanionReaction {
  id: string
  dedupKey: string
  kind: ReactionKind
  heading: string
  body: string
  detail?: string
  ctaLabel?: string
  to?: string
  notificationId?: string
  priority: number
}

const CELEBRATE_LINES = [
  (title: string) => `Boom! "${title}" is done. You're on fire!`,
  (title: string) => `Look at you go! One more off your list: ${title}.`,
  () => 'Boss Baby approves. Excellent work!',
]

function celebrateBody(task: Task): string {
  const title = taskAlertTitle(task)
  const idx = Math.abs(task.id.charCodeAt(0) + title.length) % CELEBRATE_LINES.length
  return CELEBRATE_LINES[idx](title)
}

function pushReaction(out: CompanionReaction[], reaction: CompanionReaction) {
  if (hasShownReaction(reaction.dedupKey)) return
  if (out.some((r) => r.dedupKey === reaction.dedupKey)) return
  markReactionShown(reaction.dedupKey)
  out.push(reaction)
}

/** Unread Firestore notifications → one-time companion reactions. */
export function reactionsFromNotifications(notifications: AppNotification[]): CompanionReaction[] {
  const out: CompanionReaction[] = []
  const unread = notifications.filter((n) => !n.readAt)

  for (const n of unread) {
    const dedupKey = `notif:${n.id}`
    const action = notificationAction(n)
    let kind: ReactionKind | null = null
    let heading = n.title
    let body = n.body
    let ctaLabel = action?.label

    switch (n.type) {
      case 'task_assigned':
      case 'task_reassigned':
      case 'task_forwarded':
        kind = 'assigned'
        heading = 'New assignment'
        body = `Boss Baby reporting for duty! ${n.body}`
        break
      case 'task_completed':
        kind = 'celebrate'
        heading = 'TASK COMPLETED!'
        body = n.body || 'Boom! Another one off your list. Boss Baby approves!'
        ctaLabel = 'View Completed Task'
        break
      case 'task_deadline':
        kind = 'concerned'
        heading = 'Deadline approaching'
        body = 'Psst… this deadline is getting close!'
        if (n.body) body = `${body} ${n.body}`
        break
      case 'task_overdue':
        kind = 'overdue'
        heading = 'Overdue'
        body = 'Boss Baby has spotted a little backlog!'
        if (n.body) body = n.body
        break
      case 'message_direct':
      case 'message_group':
        kind = 'message'
        heading = n.title || 'New message'
        body = n.body || 'Someone sent you a message.'
        ctaLabel =
          n.entityId?.startsWith('task-') ? 'Open Task Chat' : (action?.label ?? 'Open Chat')
        break
      default:
        break
    }

    if (!kind) continue

    pushReaction(out, {
      id: dedupKey,
      dedupKey,
      kind,
      heading,
      body,
      ctaLabel,
      to: action?.to,
      notificationId: n.id,
      priority: notificationReactionPriority(n.type),
    })
  }

  return out
}

function notificationReactionPriority(type: AppNotification['type']): number {
  if (type === 'task_overdue') return 10
  if (type === 'task_assigned' || type === 'task_reassigned' || type === 'task_forwarded') return 12
  if (type === 'message_direct' || type === 'message_group') return 14
  if (type === 'task_deadline') return 22
  if (type === 'task_completed') return 40
  return 30
}

export interface TaskSnapshot {
  status: Map<string, string>
  hydrated: boolean
}

export function reactionsFromTaskTransitions(
  tasks: Task[],
  userId: string,
  snapshot: TaskSnapshot,
): { reactions: CompanionReaction[]; next: TaskSnapshot } {
  const out: CompanionReaction[] = []
  const lists = computeCompanionTaskLists(tasks, userId)
  const mine = tasks.filter((t) => t.assigneeIds.includes(userId))
  const nextStatus = new Map(snapshot.status)

  if (!snapshot.hydrated) {
    for (const t of mine) nextStatus.set(t.id, t.status)
    return { reactions: [], next: { status: nextStatus, hydrated: true } }
  }

  const day = todayKey()

  for (const t of mine) {
    const prev = snapshot.status.get(t.id)
    const wasKnown = snapshot.status.has(t.id)

    if (!wasKnown && isTaskPending(t)) {
      const dedupKey = `assigned:${t.id}`
      pushReaction(out, {
        id: dedupKey,
        dedupKey,
        kind: 'assigned',
        heading: 'New assignment',
        body: `Boss Baby reporting for duty! You've got a new task: ${taskAlertTitle(t)}.`,
        detail: taskDeadlineLabel(t) ? `Due ${taskDeadlineLabel(t)}` : undefined,
        ctaLabel: 'View Task',
        to: taskDetailPath(t.id),
        priority: 12,
      })
    }

    if (
      wasKnown &&
      prev !== 'completed' &&
      t.status === 'completed'
    ) {
      const dedupKey = `completed:${t.id}:${day}`
      pushReaction(out, {
        id: dedupKey,
        dedupKey,
        kind: 'celebrate',
        heading: 'TASK COMPLETED!',
        body: celebrateBody(t),
        detail: taskAlertTitle(t),
        ctaLabel: 'View Completed Task',
        to: taskDetailPath(t.id),
        priority: 35,
      })
    }

    nextStatus.set(t.id, t.status)
  }

  for (const t of lists.approaching) {
    const dedupKey = `approaching:${t.id}:${day}`
    pushReaction(out, {
      id: dedupKey,
      dedupKey,
      kind: 'concerned',
      heading: 'Due soon',
      body: `Your task "${taskAlertTitle(t)}" is due soon. Let's get ahead of it!`,
      detail: taskDeadlineLabel(t) ? `Due ${taskDeadlineLabel(t)}` : undefined,
      ctaLabel: 'View Task',
      to: taskDetailPath(t.id),
      priority: 24,
    })
  }

  if (lists.overdue.length === 1) {
    const t = lists.overdue[0]!
    const dedupKey = `overdue:${t.id}:${day}`
    pushReaction(out, {
      id: dedupKey,
      dedupKey,
      kind: 'overdue',
      heading: 'Overdue',
      body: `The deadline has passed for "${taskAlertTitle(t)}." Time for a comeback!`,
      ctaLabel: 'Review Task',
      to: taskDetailPath(t.id),
      priority: 11,
    })
  } else if (lists.overdue.length > 1) {
    const dedupKey = `overdue:multi:${day}`
    pushReaction(out, {
      id: dedupKey,
      dedupKey,
      kind: 'overdue',
      heading: 'Overdue',
      body: `Boss Baby has spotted a little backlog — ${lists.overdue.length} tasks overdue.`,
      detail: `Next: ${taskAlertTitle(lists.overdue[0]!)}`,
      ctaLabel: 'Review Overdue Tasks',
      to: COMPANION_ROUTES.tasksOverdue,
      priority: 11,
    })
  }

  const completedDueToday = lists.completedToday.filter((t) => isTaskDueToday(t))
  const allDueTodayDone =
    lists.dueToday.length === 0 &&
    lists.overdue.length === 0 &&
    completedDueToday.length > 0

  if (allDueTodayDone) {
    const dedupKey = `relaxed:cleared:${day}`
    pushReaction(out, {
      id: dedupKey,
      dedupKey,
      kind: 'relaxed',
      heading: 'All clear',
      body: 'All your tasks due today are done. Go you!',
      ctaLabel: 'View Tasks',
      to: COMPANION_ROUTES.tasksCompleted,
      priority: 55,
    })
  }

  return { reactions: out, next: { status: nextStatus, hydrated: true } }
}

export function idleQuietReaction(): CompanionReaction | null {
  const dedupKey = `idle:quiet:${todayKey()}`
  if (hasShownReaction(dedupKey)) return null
  markReactionShown(dedupKey)
  return {
    id: dedupKey,
    dedupKey,
    kind: 'idle',
    heading: 'Standing by',
    body: 'All quiet for now. Baby CEO is standing by!',
    priority: 99,
  }
}

export function sortReactions(reactions: CompanionReaction[]): CompanionReaction[] {
  return [...reactions].sort((a, b) => a.priority - b.priority)
}

export function reactionToMood(kind: ReactionKind): import('@/lib/companion/companionStats').CompanionMood {
  switch (kind) {
    case 'assigned':
      return 'assigned'
    case 'message':
      return 'assigned'
    case 'celebrate':
      return 'celebrate'
    case 'concerned':
      return 'concerned'
    case 'overdue':
      return 'overdue'
    case 'relaxed':
      return 'relaxed'
    case 'idle':
      return 'idle'
    default:
      return 'idle'
  }
}
