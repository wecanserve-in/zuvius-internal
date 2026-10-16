import type { Request, Response } from 'express'

/** Browser origins allowed to call upload HTTP endpoints (not R2 presigned PUT). */
export const UPLOAD_HTTP_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://internal-chat-bc793.web.app',
  'https://internal-chat-bc793.firebaseapp.com',
  'https://zuvius-internal.vercel.app',
]

/** For Firebase `onRequest({ cors })` — must be a plain string array. */
export const uploadCorsOption: string[] = [...UPLOAD_HTTP_ALLOWED_ORIGINS]

export function isAllowedUploadOrigin(origin: string | undefined): boolean {
  if (!origin) return false
  if ((UPLOAD_HTTP_ALLOWED_ORIGINS as readonly string[]).includes(origin)) return true
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true
  if (/^https:\/\/zuvius-internal(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) return true
  return false
}

export function resolveCorsOrigin(req: Request): string | null {
  const origin = req.get('origin') ?? req.get('Origin') ?? undefined
  return isAllowedUploadOrigin(origin) ? origin! : null
}

const ALLOWED_METHODS = 'GET, POST, OPTIONS'
const ALLOWED_HEADERS =
  'Authorization, Content-Type, X-Requested-With, X-Firebase-AppCheck, Firebase-Instance-ID-Token'

/** Sets CORS headers on success and error responses. */
export function applyUploadCorsHeaders(req: Request, res: Response): void {
  const origin = resolveCorsOrigin(req)
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS)
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  res.setHeader('Access-Control-Max-Age', '3600')
}

/** Returns true when the request was handled as OPTIONS preflight (204, no auth). */
export function handleUploadCorsPreflight(req: Request, res: Response): boolean {
  applyUploadCorsHeaders(req, res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}
