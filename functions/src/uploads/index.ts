import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { runConfirmUpload, runGetDownloadUrl, runRequestUpload, type RequestUploadPayload } from './core'

/** Callable wrappers (Firebase SDK). CORS: string origins only on Gen2. */
const callCors = {
  cors: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://internal-chat-bc793.web.app',
    'https://internal-chat-bc793.firebaseapp.com',
  ],
  invoker: 'public' as const,
}

export const requestUploadCallable = onCall(
  { cors: callCors.cors, invoker: 'public' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required')
    return runRequestUpload(request.auth.uid, request.data as RequestUploadPayload)
  },
)

export const confirmUploadCallable = onCall(
  { cors: callCors.cors, invoker: 'public' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required')
    const { uploadId } = request.data as { uploadId: string }
    return runConfirmUpload(request.auth.uid, uploadId)
  },
)

export const getDownloadUrlCallable = onCall(
  { cors: callCors.cors, invoker: 'public' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required')
    const { uploadId } = request.data as { uploadId: string }
    return runGetDownloadUrl(request.auth.uid, uploadId)
  },
)
