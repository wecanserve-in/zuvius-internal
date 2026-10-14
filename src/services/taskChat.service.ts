import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { getOrCreateDirectConversation } from '@/services/conversations.service'
import type { AppUser, Task, TaskChatEvent } from '@/types'

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

async function upsertTaskChatMessage(
  actor: AppUser,
  otherUserId: string,
  messageDocId: string,
  taskEvent: TaskChatEvent,
): Promise<void> {
  const conversationId = await getOrCreateDirectConversation(actor, otherUserId)
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

/** Idempotent: one structured message per assignee in DM with assigner. */
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
    await upsertTaskChatMessage(
      assigner,
      assigneeId,
      `task-event-${event.eventKey}`,
      event,
    )
  }
}

export async function postTaskHandoverChatEvents(
  forwarder: AppUser,
  task: Task,
  newAssigneeId: string,
  handoverNote: string,
  idempotencyKey: string,
): Promise<void> {
  const creatorId = task.createdBy
  const forwardEventKey = `forward-${idempotencyKey}`
  const assignEventKey = `assign-${idempotencyKey}`

  if (creatorId !== forwarder.id) {
    const forwardEvent = taskEventFromTask(task, 'forwarded', newAssigneeId, creatorId, {
      eventKey: forwardEventKey,
      previousAssigneeId: forwarder.id,
      handoverNote,
    })
    await upsertTaskChatMessage(
      forwarder,
      creatorId,
      `task-event-${forwardEventKey}`,
      forwardEvent,
    )
  }

  if (newAssigneeId !== forwarder.id) {
    const assignEvent = taskEventFromTask(task, 'assigned', newAssigneeId, creatorId, {
      eventKey: assignEventKey,
      previousAssigneeId: forwarder.id,
      handoverNote,
    })
    await upsertTaskChatMessage(
      forwarder,
      newAssigneeId,
      `task-event-${assignEventKey}`,
      assignEvent,
    )
  }
}
