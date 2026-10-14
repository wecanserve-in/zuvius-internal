import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import { auth, firebaseConfig, functions } from '@/lib/firebase/config'
import { resolvePublicFileUrl } from '@/lib/resolveFileUrl'

const functionsRegion =
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION ?? 'asia-south1'
const projectId = firebaseConfig.projectId ?? 'internal-chat-bc793'

/** HTTP upload endpoints (not the callable SDK URL). */
function uploadHttpUrl(functionName: string): string {
  const useDevProxy =
    import.meta.env.DEV && import.meta.env.VITE_UPLOAD_USE_VITE_PROXY !== 'false'
  if (useDevProxy || import.meta.env.VITE_UPLOAD_USE_VITE_PROXY === 'true') {
    return `/upload-api/${functionName}`
  }
  const customBase = import.meta.env.VITE_UPLOAD_API_BASE?.replace(/\/+$/, '')
  if (customBase) return `${customBase}/${functionName}`
  const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
  if (useEmulators) {
    const host = import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1'
    const port = import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT ?? '5001'
    return `http://${host}:${port}/${projectId}/${functionsRegion}/${functionName}`
  }
  return `https://${functionsRegion}-${projectId}.cloudfunctions.net/${functionName}`
}

export class UploadApiError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

/** Maps callable / HTTP / network errors to user-facing upload messages. */
export function formatUploadCallableError(err: unknown): string {
  if (err instanceof UploadApiError) {
    return err.message
  }
  if (err instanceof FirebaseError) {
    if (err.code === 'functions/not-found' || err.code === 'functions/unavailable') {
      return (
        'Upload functions are not deployed or unreachable. Run scripts/deploy-upload-functions.ps1 ' +
        'after firebase login and R2 secrets are configured (region asia-south1).'
      )
    }
    if (err.message) return err.message
  }
  if (err instanceof Error) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      const emulatorHint =
        import.meta.env.VITE_UPLOAD_USE_VITE_PROXY === 'true' ||
        import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
          ? ' Start the Functions emulator: cd functions && npm run serve (R2 keys in functions/.env.internal-chat-bc793).'
          : ' Deploy upload functions (see scripts/deploy-upload-functions.ps1) or set VITE_UPLOAD_USE_VITE_PROXY=true with the emulator.'
      return `Could not reach upload API (network or CORS).${emulatorHint}`
    }
    if (/Upload API error \(404\)/i.test(err.message)) {
      return (
        'Upload API returned 404 — requestUpload is not deployed or the emulator is not running. ' +
        'Deploy upload functions or run: cd functions && npm run serve with VITE_UPLOAD_USE_VITE_PROXY=true in .env.local.'
      )
    }
    if (/failed with status/i.test(err.message)) {
      return `${err.message}. If this is a CORS error on PUT, apply docs/r2-cors.json to the lms-portal bucket in Cloudflare.`
    }
    return err.message
  }
  return 'Could not upload attachment'
}

async function postUploadHttp<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const user = auth.currentUser
  if (!user) {
    throw new UploadApiError('unauthenticated', 'Sign in again to upload attachments.')
  }
  const token = await user.getIdToken()
  const res = await fetch(uploadHttpUrl(functionName), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let code = 'internal'
    let message = `Upload API error (${res.status})`
    try {
      const json = (await res.json()) as { error?: { code?: string; message?: string } }
      if (json.error?.message) message = json.error.message
      if (json.error?.code) code = json.error.code
    } catch {
      // non-JSON body
    }
    throw new UploadApiError(code, message)
  }

  return res.json() as Promise<T>
}

export async function checkUploadBackendReady(): Promise<boolean> {
  try {
    const fn = httpsCallable<void, { ok: boolean; r2?: boolean }>(functions, 'uploadHealthR2')
    const result = await fn()
    return result.data.ok === true && result.data.r2 === true
  } catch {
    return false
  }
}

export interface RequestUploadInput {
  fileName: string
  contentType: string
  size: number
  relatedEntityType: 'task' | 'conversation' | 'message' | 'profile'
  relatedEntityId: string
}

export interface RequestUploadResult {
  uploadId: string
  objectKey: string
  uploadUrl: string
  fileUrl?: string
  expiresIn: number
}

export interface UploadFileMeta {
  uploadId: string
  objectKey: string
  contentType: string
  size: number
  fileName: string
  fileUrl?: string
}

export interface SignedDownloadResult {
  downloadUrl: string
  expiresIn: number
}

/** Authorize upload via HTTP endpoint (explicit CORS + Firebase ID token). */
export async function requestUpload(input: RequestUploadInput): Promise<RequestUploadResult> {
  return postUploadHttp<RequestUploadResult>('requestUpload', { ...input })
}

export async function confirmUpload(uploadId: string): Promise<{ fileUrl?: string }> {
  return postUploadHttp<{ ok: boolean; fileUrl?: string }>('confirmUpload', { uploadId })
}

export async function getDownloadUrl(uploadId: string): Promise<string> {
  const result = await postUploadHttp<SignedDownloadResult>('getDownloadUrl', { uploadId })
  return result.downloadUrl
}

function putToPresignedUrl(
  uploadUrl: string,
  file: Blob,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed with status ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })
}

export async function uploadFileToR2(
  uploadUrl: string,
  file: Blob,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  try {
    await putToPresignedUrl(uploadUrl, file, contentType, onProgress)
  } catch (first) {
    await putToPresignedUrl(uploadUrl, file, contentType, onProgress).catch(() => {
      throw first
    })
  }
}

export async function uploadProfilePhoto(
  userId: string,
  file: Blob,
  fileName: string,
  contentType: string,
): Promise<{ uploadId: string; fileUrl?: string }> {
  const { uploadId, objectKey, uploadUrl, fileUrl: initialUrl } = await requestUpload({
    fileName,
    contentType,
    size: file.size,
    relatedEntityType: 'profile',
    relatedEntityId: userId,
  })
  await uploadFileToR2(uploadUrl, file, contentType)
  const confirmed = await confirmUpload(uploadId)
  const fileUrl = resolvePublicFileUrl(
    objectKey,
    confirmed.fileUrl ?? initialUrl,
  )
  return { uploadId, fileUrl }
}

/** Upload file to R2 and return attachment metadata for a chat message. */
export async function uploadConversationAttachment(
  conversationId: string,
  file: Blob,
  fileName: string,
  contentType: string,
): Promise<UploadFileMeta> {
  const { uploadId, objectKey, uploadUrl, fileUrl: initialUrl } = await requestUpload({
    fileName,
    contentType,
    size: file.size,
    relatedEntityType: 'conversation',
    relatedEntityId: conversationId,
  })
  await uploadFileToR2(uploadUrl, file, contentType)
  const confirmed = await confirmUpload(uploadId)
  const fileUrl = resolvePublicFileUrl(objectKey, confirmed.fileUrl ?? initialUrl)
  return {
    uploadId,
    objectKey,
    contentType,
    size: file.size,
    fileName,
    ...(fileUrl ? { fileUrl } : {}),
  }
}
