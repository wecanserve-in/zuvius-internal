import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { resolvePublicFileUrl } from '@/lib/resolveFileUrl'
import { canUseDirectR2Upload, presignGetObjectUrl } from '@/lib/r2DirectUpload'
import { getDownloadUrl } from '@/services/uploads.service'
import type { ChatMessage } from '@/types'

type MessageAttachment = NonNullable<ChatMessage['attachment']>

async function resolveObjectKey(attachment: MessageAttachment): Promise<string | undefined> {
  if (attachment.objectKey?.trim()) return attachment.objectKey
  if (!attachment.uploadId) return undefined
  try {
    const snap = await getDoc(doc(db, 'uploads', attachment.uploadId))
    if (!snap.exists()) return undefined
    const key = snap.data().objectKey
    return typeof key === 'string' && key.trim() ? key : undefined
  } catch {
    return undefined
  }
}

/** URL to display or download a message attachment (public CDN, presigned GET, or upload API). */
export async function resolveMessageAttachmentUrl(
  attachment: MessageAttachment,
): Promise<string | undefined> {
  const objectKey = await resolveObjectKey(attachment)
  return resolveStoredUploadUrl({
    uploadId: attachment.uploadId,
    objectKey,
    fileUrl: attachment.fileUrl,
    fileName: attachment.fileName,
  })
}

/** Task / upload record — resolve by objectKey when present (assignees can open links). */
export async function resolveStoredUploadUrl(input: {
  uploadId: string
  objectKey?: string
  fileUrl?: string
  fileName?: string
}): Promise<string | undefined> {
  if (input.objectKey) {
    const stable = resolvePublicFileUrl(input.objectKey, input.fileUrl)
    if (stable) return stable
    if (canUseDirectR2Upload()) {
      return presignGetObjectUrl(input.objectKey)
    }
  }
  if (input.uploadId) {
    try {
      return await getDownloadUrl(input.uploadId)
    } catch {
      return undefined
    }
  }
  return undefined
}
