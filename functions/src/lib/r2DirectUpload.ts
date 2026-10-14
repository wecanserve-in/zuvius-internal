import { PutObjectCommand } from '@aws-sdk/client-s3'
import type { Readable } from 'node:stream'
import { buildObjectKey, buildPublicFileUrl, getR2Client, validateUpload } from './r2'

export type DirectUploadInput = {
  ownerId: string
  fileName: string
  contentType: string
  body: Buffer | Uint8Array | Readable
  size: number
  relatedEntityType: string
}

/** Server-side PutObject (same SDK pattern as AddCourse). Used by Cloud Functions, not the browser. */
export async function uploadBufferToR2(input: DirectUploadInput): Promise<{
  objectKey: string
  fileUrl: string | null
}> {
  validateUpload(input.contentType, input.size)
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME is not configured')

  const objectKey = buildObjectKey(
    input.ownerId,
    input.fileName,
    input.relatedEntityType,
    input.contentType,
  )
  const client = getR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: input.body,
      ContentType: input.contentType,
      Metadata: {
        originalFileName: input.fileName.slice(0, 200),
        uploadedBy: input.ownerId,
      },
    }),
  )
  return { objectKey, fileUrl: buildPublicFileUrl(objectKey) }
}
