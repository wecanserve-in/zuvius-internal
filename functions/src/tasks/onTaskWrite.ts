import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'

export const onTaskWritten = onDocumentWritten('tasks/{taskId}', async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!after) return

  const taskId = event.params.taskId
  const db = admin.firestore()

  if (!before) {
    await db.collection('activityLogs').add({
      actorId: after.createdBy,
      action: 'task.created',
      entityType: 'task',
      entityId: taskId,
      metadata: { title: after.title },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    const assigneeIds = (after.assigneeIds ?? []) as string[]
    for (const recipientId of assigneeIds) {
      await db.collection('notifications').add({
        recipientId,
        type: 'task_assigned',
        title: 'New task assigned',
        body: after.title,
        entityType: 'task',
        entityId: taskId,
        readAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
    return
  }

  if (before.status !== after.status) {
    await db.collection('activityLogs').add({
      actorId: after.updatedBy ?? after.createdBy,
      action: 'task.status_changed',
      entityType: 'task',
      entityId: taskId,
      metadata: { from: before.status, to: after.status },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
})
