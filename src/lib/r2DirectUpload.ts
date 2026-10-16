import { r2AccountId, r2BucketName, r2ObjectPrefix, buildPublicFileUrlFromKey } from '@/lib/r2Config'

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

export function hasDirectR2Credentials(): boolean {
  return Boolean(
    import.meta.env.VITE_R2_ACCESS_KEY_ID?.trim() &&
      import.meta.env.VITE_R2_SECRET_ACCESS_KEY?.trim() &&
      r2AccountId &&
      r2BucketName,
  )
}

/** AddCourse-style browser PutObject when VITE_R2_* keys are in the build (local or Vercel). */
export function canUseDirectR2Upload(): boolean {
  if (import.meta.env.VITE_UPLOAD_DIRECT_R2 === 'false') return false
  return hasDirectR2Credentials()
}

export const DIRECT_R2_KEYS_HINT =
  'Add VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_ACCOUNT_ID, VITE_R2_BUCKET_NAME ' +
  '(and VITE_UPLOAD_DIRECT_R2=true) to .env.local or Vercel → Project Settings → Environment Variables, then redeploy.'

export function validateUploadClient(contentType: string, size: number): void {
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
  relatedEntityType: string,
  contentType: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  const prefix = r2ObjectPrefix.replace(/^\/+|\/+$/g, '')
  const folder = folderForUpload(relatedEntityType, contentType)
  const id = crypto.randomUUID()
  return `${prefix}/${folder}/${ownerId}/${id}-${safeName}`
}

type S3Module = typeof import('@aws-sdk/client-s3')
let client: InstanceType<S3Module['S3Client']> | null = null
let s3Module: S3Module | null = null

async function loadS3(): Promise<S3Module> {
  if (!s3Module) {
    s3Module = await import('@aws-sdk/client-s3')
  }
  return s3Module
}

async function getClient(): Promise<InstanceType<S3Module['S3Client']>> {
  if (!client) {
    const { S3Client } = await loadS3()
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID as string,
        secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY as string,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
    })
  }
  return client
}

export async function putObjectDirect(
  objectKey: string,
  body: Blob,
  contentType: string,
): Promise<void> {
  const { PutObjectCommand } = await loadS3()
  const command = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: objectKey,
    Body: body,
    ContentType: contentType,
  })
  await (await getClient()).send(command)
}

export function publicUrlForKey(objectKey: string): string | undefined {
  return buildPublicFileUrlFromKey(objectKey)
}

/** Short-lived read URL for chat attachments (works without VITE_R2_PUBLIC_URL). */
export async function presignGetObjectUrl(
  objectKey: string,
  expiresIn = 3600,
): Promise<string> {
  const { GetObjectCommand } = await loadS3()
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  const command = new GetObjectCommand({
    Bucket: r2BucketName,
    Key: objectKey,
  })
  return getSignedUrl(await getClient(), command, { expiresIn })
}
