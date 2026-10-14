import * as admin from 'firebase-admin'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { hasMinRole, type UserRole } from '../lib/roles'

interface CreateDepartmentInput {
  name: string
  description?: string
}

export const createDepartment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const actorSnap = await admin.firestore().doc(`users/${request.auth.uid}`).get()
  const actor = actorSnap.data()
  if (!actor?.isActive) {
    throw new HttpsError('permission-denied', 'Inactive account')
  }

  if (!hasMinRole(actor.role as UserRole, 'admin')) {
    throw new HttpsError('permission-denied', 'Admin access required')
  }

  const data = request.data as CreateDepartmentInput
  const name = data?.name?.trim()
  if (!name || name.length < 2) {
    throw new HttpsError('invalid-argument', 'Department name is required')
  }

  const ref = await admin.firestore().collection('departments').add({
    name,
    description: data.description?.trim() ?? null,
    adminIds: [],
    memberIds: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  await admin.firestore().collection('activityLogs').add({
    actorId: request.auth.uid,
    action: 'department.created',
    entityType: 'department',
    entityId: ref.id,
    metadata: { name },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { departmentId: ref.id }
})
