import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

export function parseDotEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

/** Dev: reuse R2 keys from functions/.env.<projectId> (same as AddCourse, no duplicate in .env.local). */
export function hydrateR2EnvFromFunctions(projectId, mode) {
  if (mode !== 'development') return
  if (process.env.VITE_R2_ACCESS_KEY_ID?.trim()) return

  const file = path.join(root, 'functions', `.env.${projectId}`)
  if (!existsSync(file)) return

  const parsed = parseDotEnv(readFileSync(file, 'utf8'))
  if (!parsed.R2_ACCESS_KEY_ID?.trim() || !parsed.R2_SECRET_ACCESS_KEY?.trim()) return

  process.env.VITE_R2_ACCESS_KEY_ID = parsed.R2_ACCESS_KEY_ID.trim()
  process.env.VITE_R2_SECRET_ACCESS_KEY = parsed.R2_SECRET_ACCESS_KEY.trim()
  if (!process.env.VITE_UPLOAD_DIRECT_R2) {
    process.env.VITE_UPLOAD_DIRECT_R2 = 'true'
  }
  if (process.env.VITE_UPLOAD_USE_VITE_PROXY !== 'true') {
    process.env.VITE_UPLOAD_USE_VITE_PROXY = 'false'
  }
  const publicUrl = parsed.R2_PUBLIC_URL?.trim() || parsed.R2_PUBLIC_URL_BASE?.trim()
  if (publicUrl && !process.env.VITE_R2_PUBLIC_URL?.trim()) {
    process.env.VITE_R2_PUBLIC_URL = publicUrl
  }
}
