import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'

const db = admin.firestore()

export const taskDeadlineReminders = onSchedule('every 60 minutes', async () => {
  const now = admin.firestore.Timestamp.now()
  const in24h = admin.firestore.Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000)

  const dueSoonSnap = await db
    .collection('tasks')
    .where('status', 'in', ['todo', 'in_progress', 'needs_revision'])
    .where('deadlineAt', '>=', now)
    .where('deadlineAt', '<=', in24h)
    .get()

  for (const taskDoc of dueSoonSnap.docs) {
    const task = taskDoc.data()
    const assigneeIds = (task.assigneeIds ?? []) as string[]
    for (const recipientId of assigneeIds) {
      const idempotencyKey = `deadline:${taskDoc.id}:${recipientId}:${now.toDate().toISOString().slice(0, 10)}`
      const existing = await db.collection('reminderEvents').doc(idempotencyKey).get()
      if (existing.exists) continue

      await db.collection('notifications').add({
        recipientId,
        type: 'task_deadline',
        title: 'Upcoming deadline',
        body: `Task "${task.title}" is due within 24 hours.`,
        entityType: 'task',
        entityId: taskDoc.id,
        readAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      await db.collection('reminderEvents').doc(idempotencyKey).set({
        taskId: taskDoc.id,
        recipientId,
        kind: 'deadline_24h',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
  }

  const overdueSnap = await db
    .collection('tasks')
    .where('status', 'in', ['todo', 'in_progress', 'needs_revision'])
    .where('deadlineAt', '<', now)
    .get()

  for (const taskDoc of overdueSnap.docs) {
    const task = taskDoc.data()
    const assigneeIds = (task.assigneeIds ?? []) as string[]
    for (const recipientId of assigneeIds) {
      const idempotencyKey = `overdue:${taskDoc.id}:${recipientId}:${now.toDate().toISOString().slice(0, 10)}`
      const existing = await db.collection('reminderEvents').doc(idempotencyKey).get()
      if (existing.exists) continue

      await db.collection('notifications').add({
        recipientId,
        type: 'task_overdue',
        title: 'Task overdue',
        body: `Task "${task.title}" is past its deadline.`,
        entityType: 'task',
        entityId: taskDoc.id,
        readAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      await db.collection('reminderEvents').doc(idempotencyKey).set({
        taskId: taskDoc.id,
        recipientId,
        kind: 'overdue',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
  }
})
