/**
 * Verifies R2 credentials in functions/.env.internal-chat-bc793 (put + delete test object).
 * Usage: node scripts/verify-r2-put.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.internal-chat-bc793')
const envText = readFileSync(envPath, 'utf8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_OBJECT_PREFIX = 'zuvius-internal',
} = process.env

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('Missing R2_* in', envPath)
  process.exit(1)
}

const prefix = R2_OBJECT_PREFIX.replace(/^\/+|\/+$/g, '')
const key = `${prefix}/_healthcheck/${Date.now()}-verify.txt`
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const putUrl = await getSignedUrl(
  client,
  new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, ContentType: 'text/plain' }),
  { expiresIn: 300 },
)

const body = 'zuvius-internal-r2-ok'
const putRes = await fetch(putUrl, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body })
if (!putRes.ok) {
  console.error('PUT failed', putRes.status, await putRes.text())
  process.exit(1)
}

await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
console.log('OK: wrote and deleted', key, 'in bucket', R2_BUCKET_NAME)
