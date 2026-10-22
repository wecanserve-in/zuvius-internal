import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Minimal KEY=value parser (no dependency on dotenv). */
export function readEnvFile(file: string): Record<string, string> {
  const path = resolve(process.cwd(), file)
  if (!existsSync(path)) return {}
  const out: Record<string, string> = {}
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

const e2e = { ...readEnvFile('.env.e2e.local'), ...process.env }
const app = readEnvFile('.env.local')

export const adminEmail = e2e.E2E_ADMIN_EMAIL ?? ''
export const adminPassword = e2e.E2E_ADMIN_PASSWORD ?? ''
export const emailDomain = e2e.E2E_EMAIL_DOMAIN || 'zuvius-qa.test'

export const firebaseConfig = {
  apiKey: app.VITE_FIREBASE_API_KEY,
  authDomain: app.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: app.VITE_FIREBASE_PROJECT_ID,
  storageBucket: app.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: app.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: app.VITE_FIREBASE_APP_ID,
}
