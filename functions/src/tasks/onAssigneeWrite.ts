import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'

const db = admin.firestore()

async function notifyRecipients(
  recipientIds: string[],
  taskId: string,
  title: string,
  body: string,
) {
  for (const recipientId of recipientIds) {
    await db.collection('notifications').add({
      recipientId,
      type: 'task_completed',
      title,
      body,
      entityType: 'task',
      entityId: taskId,
      readAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
}

export const onAssigneeWritten = onDocumentWritten(
  'tasks/{taskId}/assignees/{assigneeId}',
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!after || before?.status === after.status) return
    if (after.status !== 'completed') return

    const taskId = event.params.taskId
    const assigneeId = event.params.assigneeId
    const taskSnap = await db.doc(`tasks/${taskId}`).get()
    if (!taskSnap.exists) return
    const task = taskSnap.data()!
    const taskTitle = String(task.title ?? 'Task')

    const assigneeSnap = await db.doc(`users/${assigneeId}`).get()
    const assigneeName = assigneeSnap.exists
      ? String(assigneeSnap.data()?.displayName ?? 'Someone')
      : 'Someone'

    const recipients = new Set<string>()
    const createdBy = String(task.createdBy ?? '')
    if (createdBy && createdBy !== assigneeId) recipients.add(createdBy)

    const departmentId = task.departmentId ? String(task.departmentId) : null
    if (departmentId) {
      const usersSnap = await db
        .collection('users')
        .where('departmentIds', 'array-contains', departmentId)
        .get()
      for (const doc of usersSnap.docs) {
        if (doc.id === assigneeId) continue
        const role = String(doc.data().role ?? 'member')
        if (role === 'department_admin' || role === 'admin' || role === 'super_admin') {
          recipients.add(doc.id)
        }
      }
    }

    if (recipients.size === 0) return

    await notifyRecipients(
      Array.from(recipients),
      taskId,
      'Task completed',
      `${assigneeName} marked "${taskTitle}" as completed.`,
    )
  },
)
