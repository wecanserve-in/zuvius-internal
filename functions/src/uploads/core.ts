import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { bindR2Env } from '../lib/r2Env'
import {
  buildObjectKey,
  buildPublicFileUrl,
  presignGetUrl,
  presignPutUrl,
  validateUpload,
} from '../lib/r2'
import {
  assertConversationMediaAccess,
  assertProfileMediaAccess,
  assertTaskMediaAccess,
  getActiveUser,
} from './access'

export type RequestUploadPayload = {
  fileName: string
  contentType: string
  size: number
  relatedEntityType: string
  relatedEntityId: string
}

export async function runRequestUpload(uid: string, payload: RequestUploadPayload) {
  const user = await getActiveUser(uid)
  if (!user) throw new HttpsError('permission-denied', 'Inactive user')

  const { fileName, contentType, size, relatedEntityType, relatedEntityId } = payload

  if (!fileName || !contentType || !size || !relatedEntityType || !relatedEntityId) {
    throw new HttpsError('invalid-argument', 'Missing upload metadata')
  }

  try {
    validateUpload(contentType, size)
  } catch (err) {
    throw new HttpsError('invalid-argument', err instanceof Error ? err.message : 'Invalid file')
  }

  if (relatedEntityType === 'conversation') {
    await assertConversationMediaAccess(uid, relatedEntityId)
  } else if (relatedEntityType === 'task') {
    await assertTaskMediaAccess(uid, relatedEntityId)
  } else if (relatedEntityType === 'profile') {
    await assertProfileMediaAccess(uid, relatedEntityId)
  }

  try {
    bindR2Env()
    const objectKey = buildObjectKey(uid, fileName, relatedEntityType, contentType)
    const uploadRef = await admin.firestore().collection('uploads').add({
      ownerId: uid,
      objectKey,
      contentType,
      size,
      fileName,
      relatedEntityType,
      relatedEntityId,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    })

    const uploadUrl = await presignPutUrl(objectKey, contentType)
    const fileUrl = buildPublicFileUrl(objectKey)
    return {
      uploadId: uploadRef.id,
      objectKey,
      uploadUrl,
      fileUrl: fileUrl ?? undefined,
      expiresIn: 900,
    }
  } catch (err) {
    console.error('requestUpload failed', err)
    const msg = err instanceof Error ? err.message : 'Upload setup failed'
    if (msg.includes('R2') || msg.includes('configured') || msg.includes('credentials')) {
      throw new HttpsError(
        'failed-precondition',
        'File storage is not configured on the server. Set R2 secrets and redeploy upload functions.',
      )
    }
    throw new HttpsError('internal', msg)
  }
}

export async function runConfirmUpload(uid: string, uploadId: string) {
  if (!uploadId) throw new HttpsError('invalid-argument', 'uploadId required')

  const ref = admin.firestore().doc(`uploads/${uploadId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Upload not found')
  const data = snap.data()!
  if (data.ownerId !== uid) {
    throw new HttpsError('permission-denied', 'Not your upload')
  }

  bindR2Env()
  const fileUrl = buildPublicFileUrl(data.objectKey as string)
  await ref.update({
    status: 'completed',
    completedAt: FieldValue.serverTimestamp(),
    ...(fileUrl ? { fileUrl } : {}),
  })
  return { ok: true as const, fileUrl: fileUrl ?? undefined }
}

export async function runGetDownloadUrl(uid: string, uploadId: string) {
  const user = await getActiveUser(uid)
  if (!user) throw new HttpsError('permission-denied', 'Inactive user')
  if (!uploadId) throw new HttpsError('invalid-argument', 'uploadId required')

  const snap = await admin.firestore().doc(`uploads/${uploadId}`).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Upload not found')
  const upload = snap.data()!
  if (upload.status !== 'completed') {
    throw new HttpsError('failed-precondition', 'Upload not completed')
  }

  if (upload.relatedEntityType === 'conversation') {
    await assertConversationMediaAccess(uid, upload.relatedEntityId as string)
  } else if (upload.relatedEntityType === 'task') {
    await assertTaskMediaAccess(uid, upload.relatedEntityId as string)
  } else if (upload.relatedEntityType !== 'profile' && upload.ownerId !== uid) {
    throw new HttpsError('permission-denied', 'Access denied')
  }

  if (upload.fileUrl && typeof upload.fileUrl === 'string') {
    return { downloadUrl: upload.fileUrl, expiresIn: 86400 }
  }

  try {
    bindR2Env()
    const downloadUrl = await presignGetUrl(upload.objectKey as string)
    return { downloadUrl, expiresIn: 900 }
  } catch (err) {
    console.error('getDownloadUrl failed', err)
    const msg = err instanceof Error ? err.message : 'Could not create download link'
    if (msg.includes('R2') || msg.includes('configured') || msg.includes('credentials')) {
      throw new HttpsError(
        'failed-precondition',
        'File storage is not configured on the server. Set R2 secrets and redeploy upload functions.',
      )
    }
    throw new HttpsError('internal', 'Could not create download link')
  }
}
