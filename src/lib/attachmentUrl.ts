import { resolvePublicFileUrl } from '@/lib/resolveFileUrl'
import { canUseDirectR2Upload, presignGetObjectUrl } from '@/lib/r2DirectUpload'
import { getDownloadUrl } from '@/services/uploads.service'
import type { ChatMessage } from '@/types'

type MessageAttachment = NonNullable<ChatMessage['attachment']>

/** URL to display or download a message attachment (public CDN, presigned GET, or upload API). */
export async function resolveMessageAttachmentUrl(
  attachment: MessageAttachment,
): Promise<string | undefined> {
  const stable = resolvePublicFileUrl(attachment.objectKey, attachment.fileUrl)
  if (stable) return stable

  if (attachment.objectKey && canUseDirectR2Upload()) {
    return presignGetObjectUrl(attachment.objectKey)
  }

  if (attachment.uploadId) {
    return getDownloadUrl(attachment.uploadId)
  }

  return undefined
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
    return getDownloadUrl(input.uploadId)
  }
  return undefined
}
