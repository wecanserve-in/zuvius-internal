import * as admin from 'firebase-admin'
import { HttpsError } from 'firebase-functions/v2/https'
import { hasMinRole, type UserRole } from '../lib/roles'

type ActiveUser = { id: string; role?: string; departmentIds?: string[]; isActive?: boolean }

export async function getActiveUser(uid: string): Promise<ActiveUser | null> {
  const snap = await admin.firestore().doc(`users/${uid}`).get()
  if (!snap.exists) return null
  const data = snap.data()!
  if (data.isActive === false) return null
  return { id: snap.id, ...data }
}

export async function assertConversationMediaAccess(uid: string, conversationId: string) {
  const user = await getActiveUser(uid)
  if (!user) throw new HttpsError('permission-denied', 'Inactive user')
  const role = (user.role as UserRole) ?? 'member'
  if (hasMinRole(role, 'admin')) return

  const convo = await admin.firestore().doc(`conversations/${conversationId}`).get()
  if (!convo.exists) throw new HttpsError('not-found', 'Conversation not found')
  const memberIds = (convo.data()?.memberIds ?? []) as string[]
  if (!memberIds.includes(uid)) {
    throw new HttpsError('permission-denied', 'Not a conversation member')
  }
}

export async function assertTaskMediaAccess(uid: string, taskId: string) {
  const user = await getActiveUser(uid)
  if (!user) throw new HttpsError('permission-denied', 'Inactive user')
  const role = (user.role as UserRole) ?? 'member'

  const taskSnap = await admin.firestore().doc(`tasks/${taskId}`).get()
  if (!taskSnap.exists) throw new HttpsError('not-found', 'Task not found')
  const task = taskSnap.data()!
  const assigneeIds = (task.assigneeIds ?? []) as string[]

  if (hasMinRole(role, 'admin')) return
  if (task.createdBy === uid || assigneeIds.includes(uid)) return

  if (hasMinRole(role, 'department_admin') && task.departmentId) {
    const deptIds = (user.departmentIds ?? []) as string[]
    if (deptIds.includes(task.departmentId as string)) return
    const dept = await admin.firestore().doc(`departments/${task.departmentId}`).get()
    const adminIds = (dept.data()?.adminIds ?? []) as string[]
    if (adminIds.includes(uid)) return
  }

  throw new HttpsError('permission-denied', 'Access denied')
}

/** Profile media: user may upload for self; admins may upload for others. */
export async function assertProfileMediaAccess(uid: string, targetUserId: string) {
  const user = await getActiveUser(uid)
  if (!user) throw new HttpsError('permission-denied', 'Inactive user')
  const role = (user.role as UserRole) ?? 'member'
  if (uid === targetUserId) return
  if (hasMinRole(role, 'admin')) return
  throw new HttpsError('permission-denied', 'Access denied')
}
