import { addDoc, collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { hasMinRole } from '@/lib/permissions'
import { listUsersByDepartment } from '@/services/users.service'
import type { AppUser, Task } from '@/types'

async function completionRecipientIds(task: Task, completedById: string): Promise<string[]> {
  const ids = new Set<string>()
  if (task.createdBy && task.createdBy !== completedById) {
    ids.add(task.createdBy)
  }
  if (task.departmentId) {
    const deptUsers = await listUsersByDepartment(task.departmentId)
    for (const u of deptUsers) {
      if (u.id === completedById || !u.isActive) continue
      if (u.role === 'department_admin' || hasMinRole(u, 'admin')) {
        ids.add(u.id)
      }
    }
  }
  return Array.from(ids)
}

/**
 * New task: tell each assignee (runs in the browser — there are no Cloud Functions on Spark).
 * One batched write for all assignees.
 */
export async function notifyTaskAssigned(
  creator: AppUser,
  task: Pick<Task, 'id' | 'title'>,
  assigneeIds: string[],
): Promise<void> {
  const recipients = [...new Set(assigneeIds)].filter((id) => id && id !== creator.id)
  if (recipients.length === 0) return
  const batch = writeBatch(db)
  for (const recipientId of recipients) {
    batch.set(doc(collection(db, 'notifications')), {
      recipientId,
      type: 'task_assigned',
      title: 'New task assigned',
      body: `${creator.displayName} assigned you "${task.title}".`,
      entityType: 'task',
      entityId: task.id,
      readAt: null,
      createdAt: serverTimestamp(),
    })
  }
  await batch.commit()
}

export async function notifyTaskHandover(
  forwarder: AppUser,
  task: Task,
  newAssigneeId: string,
  handoverNote: string,
  idempotencyKey: string,
): Promise<void> {
  const creatorId = task.createdBy
  const body = `${forwarder.displayName} forwarded "${task.title}": ${handoverNote.slice(0, 200)}`
  const recipients = new Set<string>()
  if (creatorId && creatorId !== forwarder.id) recipients.add(creatorId)
  if (newAssigneeId !== forwarder.id) recipients.add(newAssigneeId)

  for (const recipientId of recipients) {
    await addDoc(collection(db, 'notifications'), {
      recipientId,
      type: creatorId === recipientId ? 'task_forwarded' : 'task_reassigned',
      title: creatorId === recipientId ? 'Task forwarded' : 'Task assigned to you',
      body: recipientId === newAssigneeId ? `${body} Open the task for details.` : body,
      entityType: 'task',
      entityId: task.id,
      readAt: null,
      handoverKey: idempotencyKey,
      createdAt: serverTimestamp(),
    })
  }
}

export async function notifyTaskAssigneeCompleted(
  actor: AppUser,
  task: Task,
): Promise<void> {
  const recipients = await completionRecipientIds(task, actor.id)
  if (recipients.length === 0) return

  const body = `${actor.displayName} marked "${task.title}" as completed.`
  for (const recipientId of recipients) {
    await addDoc(collection(db, 'notifications'), {
      recipientId,
      type: 'task_completed',
      title: 'Task completed',
      body,
      entityType: 'task',
      entityId: task.id,
      readAt: null,
      createdAt: serverTimestamp(),
    })
  }
}
