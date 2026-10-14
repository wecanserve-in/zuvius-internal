import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'video/',
  'audio/',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'text/plain',
]

export function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials are not configured')
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export function validateUpload(contentType: string, size: number) {
  if (size <= 0 || size > MAX_UPLOAD_BYTES) {
    throw new Error('File size is not allowed')
  }
  const allowed =
    ALLOWED_MIME_PREFIXES.some((p) => contentType.startsWith(p)) ||
    contentType === 'application/octet-stream'
  if (!allowed) {
    throw new Error('File type is not allowed')
  }
}

/** Root folder inside a shared bucket (e.g. lms-portal/zuvius-internal/...) */
export function getObjectPrefix(): string {
  const raw = process.env.R2_OBJECT_PREFIX ?? 'zuvius-internal'
  return raw.replace(/^\/+|\/+$/g, '')
}

/** Public CDN / R2 custom domain base (no trailing slash). When set, Firestore stores stable file URLs. */
export function buildPublicFileUrl(objectKey: string): string | null {
  const base = (process.env.R2_PUBLIC_URL ?? process.env.R2_PUBLIC_URL_BASE)?.replace(
    /\/+$/,
    '',
  )
  if (!base) return null
  const key = objectKey.replace(/^\/+/, '')
  return `${base}/${key}`
}

function folderForUpload(relatedEntityType: string, contentType: string): string {
  if (relatedEntityType === 'task') return 'tasks'
  if (relatedEntityType === 'profile') return 'profiles'
  if (contentType.startsWith('image/')) return 'chat-images'
  if (contentType.startsWith('video/')) return 'chat-videos'
  if (contentType.startsWith('audio/')) return 'chat-audio'
  if (
    contentType.startsWith('application/pdf') ||
    contentType.includes('document') ||
    contentType.includes('msword') ||
    contentType.includes('spreadsheet') ||
    contentType === 'text/plain'
  ) {
    return 'chat-documents'
  }
  return 'chat-attachments'
}

export function buildObjectKey(
  ownerId: string,
  fileName: string,
  relatedEntityType = 'conversation',
  contentType = 'application/octet-stream',
) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  const prefix = getObjectPrefix()
  const folder = folderForUpload(relatedEntityType, contentType)
  return `${prefix}/${folder}/${ownerId}/${randomUUID()}-${safeName}`
}

export async function presignPutUrl(objectKey: string, contentType: string, expiresIn = 900) {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME is not configured')
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType,
  })
  return getSignedUrl(client, command, { expiresIn })
}

export async function presignGetUrl(objectKey: string, expiresIn = 900) {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME is not configured')
  const client = getR2Client()
  const command = new GetObjectCommand({ Bucket: bucket, Key: objectKey })
  return getSignedUrl(client, command, { expiresIn })
}
