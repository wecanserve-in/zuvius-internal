import * as admin from 'firebase-admin'
import { HttpsError, onRequest } from 'firebase-functions/v2/https'
import {
  applyUploadCorsHeaders,
  handleUploadCorsPreflight,
  uploadCorsOption,
} from '../lib/cors'
import { publicHttpOptions } from '../lib/r2Env'
import {
  runConfirmUpload,
  runGetDownloadUrl,
  runRequestUpload,
  type RequestUploadPayload,
} from './core'

const httpOptions = {
  region: 'asia-south1' as const,
  invoker: 'public' as const,
  cors: uploadCorsOption,
}

const httpOptionsNoSecrets = {
  region: 'asia-south1' as const,
  invoker: 'public' as const,
  cors: uploadCorsOption,
}

function readJsonBody<T>(req: { method?: string; body?: unknown }): T {
  if (req.body && typeof req.body === 'object') {
    return req.body as T
  }
  return {} as T
}

async function verifyAuthHeader(
  authorization: string | undefined,
): Promise<string> {
  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }
  const token = authorization.slice('Bearer '.length).trim()
  if (!token) throw new HttpsError('unauthenticated', 'Authentication required')
  const decoded = await admin.auth().verifyIdToken(token)
  return decoded.uid
}

function httpsErrorStatus(code: string): number {
  switch (code) {
    case 'invalid-argument':
      return 400
    case 'unauthenticated':
      return 401
    case 'permission-denied':
      return 403
    case 'not-found':
      return 404
    case 'failed-precondition':
      return 412
    default:
      return 500
  }
}

function sendHttpsError(res: import('express').Response, err: unknown): void {
  if (err instanceof HttpsError) {
    res.status(httpsErrorStatus(err.code)).json({
      error: { code: err.code, message: err.message },
    })
    return
  }
  console.error('upload http error', err)
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({
    error: { code: 'internal', message },
  })
}

function withUploadHttp(
  handler: (uid: string, body: Record<string, unknown>) => Promise<unknown>,
) {
  return async (req: import('express').Request, res: import('express').Response) => {
    if (handleUploadCorsPreflight(req, res)) return
    applyUploadCorsHeaders(req, res)

    if (req.method !== 'POST') {
      res.status(405).json({ error: { code: 'method-not-allowed', message: 'Use POST' } })
      return
    }

    try {
      const uid = await verifyAuthHeader(req.get('authorization') ?? req.get('Authorization'))
      const body = readJsonBody<Record<string, unknown>>(req)
      const result = await handler(uid, body)
      res.status(200).json(result)
    } catch (err) {
      sendHttpsError(res, err)
    }
  }
}

/** HTTP upload API with explicit OPTIONS/CORS (used by the Vite app). */
export const requestUpload = onRequest(httpOptions, withUploadHttp(async (uid, body) => {
  return runRequestUpload(uid, body as RequestUploadPayload)
}))

export const confirmUpload = onRequest(
  httpOptionsNoSecrets,
  withUploadHttp(async (uid, body) => {
    const uploadId = String(body.uploadId ?? '')
    return runConfirmUpload(uid, uploadId)
  }),
)

export const getDownloadUrl = onRequest(httpOptions, withUploadHttp(async (uid, body) => {
  const uploadId = String(body.uploadId ?? '')
  return runGetDownloadUrl(uid, uploadId)
}))

/** CORS probe — OPTIONS returns 204 with headers; GET returns ok without auth. */
export const uploadCorsProbe = onRequest(publicHttpOptions, (req, res) => {
  if (handleUploadCorsPreflight(req, res)) return
  applyUploadCorsHeaders(req, res)
  res.status(200).json({ ok: true, cors: true })
})
