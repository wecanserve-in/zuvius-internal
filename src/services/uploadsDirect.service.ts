import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { hasMinRole } from '@/lib/permissions'
import {
  buildObjectKey,
  canUseDirectR2Upload,
  publicUrlForKey,
  putObjectDirect,
  validateUploadClient,
} from '@/lib/r2DirectUpload'
import type { AppUser } from '@/types'
import {
  UploadApiError,
  type RequestUploadInput,
  type RequestUploadResult,
} from '@/services/upload.types'

async function loadActiveUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data() as Omit<AppUser, 'id'>
  if (data.isActive === false) return null
  return { id: snap.id, ...data }
}

async function assertDirectUploadAccess(
  uid: string,
  user: AppUser,
  relatedEntityType: string,
  relatedEntityId: string,
): Promise<void> {
  if (relatedEntityType === 'profile') {
    if (uid === relatedEntityId || hasMinRole(user, 'admin')) return
    throw new UploadApiError('permission-denied', 'Access denied')
  }

  if (relatedEntityType === 'conversation') {
    if (hasMinRole(user, 'admin')) return
    const convo = await getDoc(doc(db, 'conversations', relatedEntityId))
    if (!convo.exists()) throw new UploadApiError('not-found', 'Conversation not found')
    const memberIds = (convo.data()?.memberIds ?? []) as string[]
    if (!memberIds.includes(uid)) {
      throw new UploadApiError('permission-denied', 'Not a conversation member')
    }
    return
  }

  if (relatedEntityType === 'task') {
    if (hasMinRole(user, 'admin')) return
    const taskSnap = await getDoc(doc(db, 'tasks', relatedEntityId))
    if (!taskSnap.exists()) throw new UploadApiError('not-found', 'Task not found')
    const task = taskSnap.data()!
    const assigneeIds = (task.assigneeIds ?? []) as string[]
    if (task.createdBy === uid || assigneeIds.includes(uid)) return
    if (hasMinRole(user, 'department_admin') && task.departmentId) {
      const deptIds = user.departmentIds ?? []
      if (deptIds.includes(task.departmentId as string)) return
      const dept = await getDoc(doc(db, 'departments', task.departmentId as string))
      const adminIds = (dept.data()?.adminIds ?? []) as string[]
      if (adminIds.includes(uid)) return
    }
    throw new UploadApiError('permission-denied', 'Access denied')
  }
}

export async function directRequestUpload(
  input: RequestUploadInput,
): Promise<RequestUploadResult> {
  if (!canUseDirectR2Upload()) {
    throw new UploadApiError('failed-precondition', 'Direct R2 upload is not configured')
  }
  const uid = auth.currentUser?.uid
  if (!uid) throw new UploadApiError('unauthenticated', 'Sign in again to upload attachments.')

  const user = await loadActiveUser(uid)
  if (!user) throw new UploadApiError('permission-denied', 'Inactive user')

  const { fileName, contentType, size, relatedEntityType, relatedEntityId } = input
  try {
    validateUploadClient(contentType, size)
  } catch (err) {
    throw new UploadApiError(
      'invalid-argument',
      err instanceof Error ? err.message : 'Invalid file',
    )
  }

  await assertDirectUploadAccess(uid, user, relatedEntityType, relatedEntityId)

  const objectKey = buildObjectKey(uid, fileName, relatedEntityType, contentType)
  const fileUrl = publicUrlForKey(objectKey)

  const ref = await addDoc(collection(db, 'uploads'), {
    ownerId: uid,
    objectKey,
    contentType,
    size,
    fileName,
    relatedEntityType,
    relatedEntityId,
    status: 'pending',
    createdAt: serverTimestamp(),
    ...(fileUrl ? { fileUrl } : {}),
  })

  return {
    uploadId: ref.id,
    objectKey,
    uploadUrl: '',
    fileUrl: fileUrl ?? undefined,
    expiresIn: 900,
  }
}

export async function directPutUploadBody(
  objectKey: string,
  file: Blob,
  contentType: string,
): Promise<void> {
  await putObjectDirect(objectKey, file, contentType)
}

export async function directConfirmUpload(uploadId: string): Promise<{ fileUrl?: string }> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new UploadApiError('unauthenticated', 'Sign in again to upload attachments.')

  const ref = doc(db, 'uploads', uploadId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new UploadApiError('not-found', 'Upload not found')
  const data = snap.data()
  if (data.ownerId !== uid) {
    throw new UploadApiError('permission-denied', 'Not your upload')
  }

  const objectKey = data.objectKey as string
  const fileUrl = (data.fileUrl as string | undefined) ?? publicUrlForKey(objectKey)
  await updateDoc(ref, {
    status: 'completed',
    completedAt: serverTimestamp(),
    ...(fileUrl ? { fileUrl } : {}),
  })
  return { fileUrl: fileUrl ?? undefined }
}

export async function directGetDownloadUrl(uploadId: string): Promise<string> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new UploadApiError('unauthenticated', 'Sign in again.')

  const snap = await getDoc(doc(db, 'uploads', uploadId))
  if (!snap.exists()) throw new UploadApiError('not-found', 'Upload not found')
  const data = snap.data()
  if (data.status !== 'completed') {
    throw new UploadApiError('failed-precondition', 'Upload not completed')
  }
  if (data.ownerId !== uid) {
    const user = await loadActiveUser(uid)
    if (!user || !hasMinRole(user, 'admin')) {
      throw new UploadApiError('permission-denied', 'Access denied')
    }
  }
  const url =
    (data.fileUrl as string | undefined) ?? publicUrlForKey(data.objectKey as string)
  if (!url) {
    throw new UploadApiError(
      'failed-precondition',
      'Set VITE_R2_PUBLIC_URL in .env.local (same as AddCourse) for file links.',
    )
  }
  return url
}
