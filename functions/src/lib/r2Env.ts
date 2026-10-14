import { defineString } from 'firebase-functions/params'

/**
 * R2 credentials are loaded from functions/.env.internal-chat-bc793 at deploy time
 * (server-only, never exposed to the React app).
 *
 * Optional: on Blaze plan you may use Secret Manager instead by switching back to defineSecret.
 */
export const r2AccessKeyId = defineString('R2_ACCESS_KEY_ID')
export const r2SecretAccessKey = defineString('R2_SECRET_ACCESS_KEY')
export const r2AccountId = defineString('R2_ACCOUNT_ID', {
  default: '45b20d97ffbad9e7a7573c735af61f19',
})
export const r2BucketName = defineString('R2_BUCKET_NAME', { default: 'lms-portal' })
export const r2ObjectPrefix = defineString('R2_OBJECT_PREFIX', { default: 'zuvius-internal' })
/** Optional public base URL for objects (e.g. R2 custom domain). Alias: R2_PUBLIC_URL. */
export const r2PublicUrlBase = defineString('R2_PUBLIC_URL_BASE', { default: '' })
export const r2PublicUrl = defineString('R2_PUBLIC_URL', { default: '' })

/** Makes R2 settings available to lib/r2.ts via process.env for this invocation. */
export function bindR2Env(): void {
  const accessKeyId = r2AccessKeyId.value()
  const secretAccessKey = r2SecretAccessKey.value()
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials are not configured')
  }
  process.env.R2_ACCESS_KEY_ID = accessKeyId
  process.env.R2_SECRET_ACCESS_KEY = secretAccessKey
  process.env.R2_ACCOUNT_ID = r2AccountId.value()
  process.env.R2_BUCKET_NAME = r2BucketName.value()
  process.env.R2_OBJECT_PREFIX = r2ObjectPrefix.value()
  const publicBase = r2PublicUrl.value() || r2PublicUrlBase.value()
  if (publicBase) {
    process.env.R2_PUBLIC_URL = publicBase
    process.env.R2_PUBLIC_URL_BASE = publicBase
  }
}

/** String origins only — RegExp breaks Gen2 callable CORS in some runtimes. */
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://internal-chat-bc793.web.app',
  'https://internal-chat-bc793.firebaseapp.com',
]

/** Gen2 HTTP/callables — public invoker so browser OPTIONS preflight succeeds. */
export const callableOptions = {
  cors: allowedOrigins,
  invoker: 'public' as const,
}

export const publicHttpOptions = {
  cors: allowedOrigins,
  invoker: 'public' as const,
  region: 'asia-south1' as const,
}
