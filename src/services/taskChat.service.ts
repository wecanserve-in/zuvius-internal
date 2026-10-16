import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { AppUser, Conversation, Task, TaskChatEvent, TaskHistoryEvent } from '@/types'

export function taskConversationId(taskId: string): string {
  return `task-${taskId}`
}

/** Hide DMs that only exist because of legacy task system messages. */
export function isTaskNotificationDm(c: Conversation): boolean {
  if (c.type !== 'direct') return false
  const preview = (c.lastMessage ?? '').trim()
  return (
    preview.startsWith('Task assigned:') ||
    preview.startsWith('Task forwarded:') ||
    preview.startsWith('Task update:')
  )
}

export function collectTaskChatMemberIds(
  task: Task,
  history: TaskHistoryEvent[] = [],
): string[] {
  const ids = new Set<string>([
    task.createdBy,
    ...task.assigneeIds,
    ...(task.formerAssigneeIds ?? []),
    ...(task.initialAssigneeIds ?? []),
  ])
  for (const event of history) {
    if (event.actorId) ids.add(event.actorId)
    if (event.newAssigneeId) ids.add(event.newAssigneeId)
    if (event.previousAssigneeId) ids.add(event.previousAssigneeId)
    if (event.assignedById) ids.add(event.assignedById)
    if (event.assigneeIds) event.assigneeIds.forEach((id) => ids.add(id))
  }
  return [...ids]
}

/** Shared group chat for everyone involved on this task. */
export async function ensureTaskGroupConversation(
  actor: AppUser,
  task: Task,
  history: TaskHistoryEvent[],
): Promise<string> {
  const conversationId = taskConversationId(task.id)
  const memberIds = collectTaskChatMemberIds(task, history)
  if (!memberIds.includes(actor.id)) {
    memberIds.push(actor.id)
  }
  const unique = [...new Set(memberIds)]
  if (unique.length < 2) {
    throw new Error('Task chat needs at least two participants')
  }

  const ref = doc(db, 'conversations', conversationId)
  const snap = await getDoc(ref)
  const title = task.title?.trim() || 'Task chat'

  if (!snap.exists()) {
    await setDoc(ref, {
      type: 'group',
      isDepartmentChannel: false,
      isTaskChannel: true,
      taskId: task.id,
      title,
      memberIds: unique,
      createdBy: actor.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
    })
    return conversationId
  }

  const existing = (snap.data().memberIds as string[] | undefined) ?? []
  const merged = [...new Set([...existing, ...unique])]
  const data = snap.data()
  const needsUpdate =
    merged.length !== existing.length ||
    title !== (data.title as string | undefined) ||
    unique.some((id) => !existing.includes(id))

  if (needsUpdate) {
    await updateDoc(ref, {
      memberIds: merged,
      title,
      updatedAt: serverTimestamp(),
    })
  }

  return conversationId
}

function taskEventPreview(event: TaskChatEvent): string {
  if (event.eventKind === 'created') return `Task assigned: ${event.title}`
  if (event.eventKind === 'forwarded') return `Task forwarded: ${event.title}`
  return `Task update: ${event.title}`
}

function taskEventFromTask(
  task: Task,
  eventKind: TaskChatEvent['eventKind'],
  assigneeId: string,
  assignedById: string,
  extras?: Partial<TaskChatEvent>,
): TaskChatEvent {
  return {
    eventKind,
    taskId: task.id,
    title: task.title,
    description: task.description || null,
    priority: task.priority,
    status: task.status,
    assignedById,
    assigneeId,
    deadlineMs: task.deadlineAt?.toMillis() ?? null,
    eventKey: extras?.eventKey ?? `${eventKind}-${task.id}`,
    ...extras,
  }
}

async function upsertTaskChannelEvent(
  actor: AppUser,
  task: Task,
  history: TaskHistoryEvent[],
  messageDocId: string,
  taskEvent: TaskChatEvent,
): Promise<void> {
  const conversationId = await ensureTaskGroupConversation(actor, task, history)
  const messageRef = doc(db, 'conversations', conversationId, 'messages', messageDocId)
  const existing = await getDoc(messageRef)
  if (existing.exists()) return

  const preview = taskEventPreview(taskEvent)
  await setDoc(messageRef, {
    senderId: actor.id,
    type: 'system',
    text: preview,
    taskEvent,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: preview.slice(0, 120),
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** Task lifecycle updates go to the task chat room — not personal DMs. */
export async function postTaskCreatedChatEvents(
  assigner: AppUser,
  task: Task,
  assigneeIds: string[],
): Promise<void> {
  for (const assigneeId of assigneeIds) {
    if (assigneeId === assigner.id) continue
    const event = taskEventFromTask(task, 'created', assigneeId, assigner.id, {
      eventKey: `created-${task.id}-${assigneeId}`,
    })
    await upsertTaskChannelEvent(assigner, task, [], `task-event-${event.eventKey}`, event)
  }
}

export async function postTaskHandoverChatEvents(
  forwarder: AppUser,
  task: Task,
  newAssigneeId: string,
  handoverNote: string,
  idempotencyKey: string,
): Promise<void> {
  const forwardEventKey = `forward-${idempotencyKey}`
  const assignEventKey = `assign-${idempotencyKey}`

  const forwardEvent = taskEventFromTask(task, 'forwarded', newAssigneeId, task.createdBy, {
    eventKey: forwardEventKey,
    previousAssigneeId: forwarder.id,
    handoverNote,
  })
  await upsertTaskChannelEvent(
    forwarder,
    task,
    [],
    `task-event-${forwardEventKey}`,
    forwardEvent,
  )

  if (newAssigneeId !== forwarder.id) {
    const assignEvent = taskEventFromTask(task, 'assigned', newAssigneeId, task.createdBy, {
      eventKey: assignEventKey,
      previousAssigneeId: forwarder.id,
      handoverNote,
    })
    await upsertTaskChannelEvent(
      forwarder,
      task,
      [],
      `task-event-${assignEventKey}`,
      assignEvent,
    )
  }
}
