import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import { auth, firebaseConfig, functions } from '@/lib/firebase/config'
import {
  canUseDirectR2Upload,
  DIRECT_R2_KEYS_HINT,
  hasDirectR2Credentials,
} from '@/lib/r2DirectUpload'
import { resolvePublicFileUrl } from '@/lib/resolveFileUrl'
import {
  directConfirmUpload,
  directGetDownloadUrl,
  directPutUploadBody,
  directRequestUpload,
} from '@/services/uploadsDirect.service'
import {
  UploadApiError,
  type RequestUploadInput,
  type RequestUploadResult,
  type SignedDownloadResult,
  type UploadFileMeta,
} from '@/services/upload.types'

export { UploadApiError, type RequestUploadInput, type RequestUploadResult, type UploadFileMeta }

const functionsRegion =
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION ?? 'asia-south1'
const projectId = firebaseConfig.projectId ?? 'internal-chat-bc793'

function cloudUploadHttpUrl(functionName: string): string {
  return `https://${functionsRegion}-${projectId}.cloudfunctions.net/${functionName}`
}

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
  return cloudUploadHttpUrl(functionName)
}

const HTTP_TO_CALLABLE: Record<string, string> = {
  requestUpload: 'requestUploadCallable',
  confirmUpload: 'confirmUploadCallable',
  getDownloadUrl: 'getDownloadUrlCallable',
}

const UPLOAD_BACKEND_HINT =
  'Local dev: run `cd functions && npm run serve` and set VITE_UPLOAD_USE_VITE_PROXY=true in .env.local. ' +
  'Hosted: deploy with scripts/deploy-upload-functions.ps1 (Blaze plan, R2 keys in functions/.env.internal-chat-bc793).'

/** Primary URL, then deployed HTTP when dev proxy is primary. */
function uploadRequestUrls(functionName: string): string[] {
  const primary = uploadHttpUrl(functionName)
  const urls = [primary]
  if (import.meta.env.DEV && primary.startsWith('/upload-api/')) {
    urls.push(cloudUploadHttpUrl(functionName))
  }
  return urls
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
      if (import.meta.env.VITE_UPLOAD_DIRECT_R2 === 'true' && !hasDirectR2Credentials()) {
        return DIRECT_R2_KEYS_HINT
      }
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

async function postUploadCallable<T>(
  callableName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const fn = httpsCallable<Record<string, unknown>, T>(functions, callableName)
  const result = await fn(body)
  return result.data
}

async function postUploadHttpOnce<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const user = auth.currentUser
  if (!user) {
    throw new UploadApiError('unauthenticated', 'Sign in again to upload attachments.')
  }
  const token = await user.getIdToken()

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error'
    const likelyNotDeployed =
      url.includes('cloudfunctions.net') || url.startsWith('/upload-api/')
    throw new UploadApiError(
      'unavailable',
      likelyNotDeployed
        ? `Upload API unreachable (${msg}). Often this is a 404 — functions not deployed or emulator not running. ${UPLOAD_BACKEND_HINT}`
        : msg,
    )
  }

  if (!res.ok) {
    let code = 'internal'
    let message = `Upload API error (${res.status})`
    if (res.status === 404) {
      code = 'unavailable'
      message = `Upload API error (404). ${UPLOAD_BACKEND_HINT}`
    }
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

async function postUploadHttp<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const skipCloudFallback =
    import.meta.env.VITE_UPLOAD_DIRECT_R2 === 'true' ||
    import.meta.env.VITE_UPLOAD_USE_VITE_PROXY === 'false'

  const urls = uploadRequestUrls(functionName)
  let last: unknown
  for (const url of urls) {
    try {
      return await postUploadHttpOnce<T>(url, body)
    } catch (err) {
      last = err
      const retryable =
        err instanceof UploadApiError &&
        (/502|503|404|unavailable/i.test(err.message) || err.code === 'unavailable')
      if (!retryable) throw err
      if (skipCloudFallback && url.includes('cloudfunctions.net')) break
    }
  }

  const callableName = skipCloudFallback ? undefined : HTTP_TO_CALLABLE[functionName]
  if (callableName) {
    try {
      return await postUploadCallable<T>(callableName, body)
    } catch (err) {
      last = err
    }
  }

  if (last instanceof UploadApiError) throw last
  if (last instanceof FirebaseError) {
    if (last.code === 'functions/not-found' || last.code === 'functions/unavailable') {
      throw new UploadApiError('unavailable', UPLOAD_BACKEND_HINT)
    }
    throw new UploadApiError(last.code, last.message)
  }
  throw last instanceof Error
    ? last
    : new UploadApiError('unavailable', UPLOAD_BACKEND_HINT)
}

export async function checkUploadBackendReady(): Promise<boolean> {
  if (canUseDirectR2Upload()) return true
  try {
    const fn = httpsCallable<void, { ok: boolean; r2?: boolean }>(functions, 'uploadHealthR2')
    const result = await fn()
    return result.data.ok === true && result.data.r2 === true
  } catch {
    return false
  }
}

function assertDirectR2OrExplain(): void {
  if (canUseDirectR2Upload()) return
  if (import.meta.env.VITE_UPLOAD_DIRECT_R2 === 'true' && !hasDirectR2Credentials()) {
    throw new UploadApiError('failed-precondition', DIRECT_R2_KEYS_HINT)
  }
}

/** Authorize upload (direct R2 like AddCourse, or HTTP/callable Functions). */
export async function requestUpload(input: RequestUploadInput): Promise<RequestUploadResult> {
  assertDirectR2OrExplain()
  if (canUseDirectR2Upload()) {
    return directRequestUpload(input)
  }
  return postUploadHttp<RequestUploadResult>('requestUpload', { ...input })
}

export async function confirmUpload(uploadId: string): Promise<{ fileUrl?: string }> {
  if (canUseDirectR2Upload()) {
    return directConfirmUpload(uploadId)
  }
  return postUploadHttp<{ ok: boolean; fileUrl?: string }>('confirmUpload', { uploadId })
}

export async function getDownloadUrl(uploadId: string): Promise<string> {
  if (canUseDirectR2Upload()) {
    return directGetDownloadUrl(uploadId)
  }
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
  objectKey?: string,
): Promise<void> {
  if (canUseDirectR2Upload() && objectKey) {
    onProgress?.(0)
    await directPutUploadBody(objectKey, file, contentType)
    onProgress?.(100)
    return
  }
  if (!uploadUrl) {
    throw new UploadApiError(
      'failed-precondition',
      'No upload URL. Enable VITE_UPLOAD_DIRECT_R2 with R2 keys, or deploy/run upload functions.',
    )
  }
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
  await uploadFileToR2(uploadUrl, file, contentType, undefined, objectKey)
  const confirmed = await confirmUpload(uploadId)
  const fileUrl = resolvePublicFileUrl(
    objectKey,
    confirmed.fileUrl ?? initialUrl,
  )
  return { uploadId, fileUrl }
}

/** New task attachments before the task doc exists (self profile upload gate). */
export type TaskUploadMeta = {
  uploadId: string
  objectKey: string
  fileName: string
}

export async function uploadFilesForNewTask(
  creatorUserId: string,
  files: File[],
): Promise<TaskUploadMeta[]> {
  const metas: TaskUploadMeta[] = []
  for (const file of files) {
    const contentType = file.type || 'application/octet-stream'
    const { uploadId, objectKey, uploadUrl } = await requestUpload({
      fileName: file.name,
      contentType,
      size: file.size,
      relatedEntityType: 'profile',
      relatedEntityId: creatorUserId,
    })
    await uploadFileToR2(uploadUrl, file, contentType, undefined, objectKey)
    await confirmUpload(uploadId)
    metas.push({ uploadId, objectKey, fileName: file.name })
  }
  return metas
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
  await uploadFileToR2(uploadUrl, file, contentType, undefined, objectKey)
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
