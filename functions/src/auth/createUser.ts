import * as admin from 'firebase-admin'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { hasMinRole, type UserRole } from '../lib/roles'

interface CreateUserInput {
  email: string
  password: string
  displayName: string
  role: UserRole
  departmentIds?: string[]
}

export const createEmployeeAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const actorSnap = await admin.firestore().doc(`users/${request.auth.uid}`).get()
  const actor = actorSnap.data()
  if (!actor?.isActive) {
    throw new HttpsError('permission-denied', 'Inactive account')
  }

  const actorRole = actor.role as UserRole
  if (!hasMinRole(actorRole, 'admin')) {
    throw new HttpsError('permission-denied', 'Admin access required')
  }

  const data = request.data as CreateUserInput
  if (!data?.email || !data.password || !data.displayName || !data.role) {
    throw new HttpsError('invalid-argument', 'Missing required fields')
  }

  if (data.role === 'super_admin' && actorRole !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Only super admin can assign super admin')
  }

  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN
  if (allowedDomain && !data.email.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`)) {
    throw new HttpsError('invalid-argument', 'Email domain is not authorized')
  }

  const userRecord = await admin.auth().createUser({
    email: data.email,
    password: data.password,
    displayName: data.displayName,
    disabled: false,
  })

  await admin.firestore().doc(`users/${userRecord.uid}`).set({
    displayName: data.displayName,
    email: data.email,
    role: data.role,
    departmentIds: data.departmentIds ?? [],
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  await admin.firestore().collection('activityLogs').add({
    actorId: request.auth.uid,
    action: 'user.created',
    entityType: 'user',
    entityId: userRecord.uid,
    metadata: { email: data.email, role: data.role },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { userId: userRecord.uid }
})
