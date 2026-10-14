import { onCall, onRequest } from 'firebase-functions/v2/https'
import { bindR2Env, callableOptions, publicHttpOptions } from '../lib/r2Env'
import { getR2Client } from '../lib/r2'

/** Callable ping (use from app / Firebase SDK). */
export const uploadHealth = onCall(
  { cors: callableOptions.cors, invoker: 'public' },
  async () => ({ ok: true, service: 'uploads' }),
)

/**
 * Verifies R2 credentials are bound (requires secrets on deploy).
 * Does not expose secret values.
 */
export const uploadHealthR2 = onCall(callableOptions, async () => {
  try {
    bindR2Env()
    getR2Client()
    return { ok: true, service: 'uploads', r2: true }
  } catch (err) {
    console.error('uploadHealthR2', err)
    return {
      ok: false,
      service: 'uploads',
      r2: false,
      hint: 'Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY secrets, then redeploy upload functions.',
    }
  }
})

/**
 * Open in browser after deploy:
 * https://asia-south1-internal-chat-bc793.cloudfunctions.net/uploadHealthHttp
 * Should return {"ok":true}. If 404, functions are not deployed.
 */
export const uploadHealthHttp = onRequest(publicHttpOptions, (_req, res) => {
  res.status(200).json({ ok: true, service: 'uploads' })
})
