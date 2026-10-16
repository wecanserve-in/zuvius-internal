import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
// Env var *names* in source are fine; fail only if literal secret material appears in the bundle.
const forbidden = [
  /secretAccessKey["']?\s*:\s*["'][a-zA-Z0-9+/=]{20,}/,
  /accessKeyId["']?\s*:\s*["'][a-zA-Z0-9]{20,}/,
  /R2_SECRET_ACCESS_KEY=[a-zA-Z0-9+/=]{8,}/,
]

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, files)
    else if (name.endsWith('.js') || name.endsWith('.css')) files.push(p)
  }
  return files
}

let failed = false
for (const file of walk(dist)) {
  const text = readFileSync(file, 'utf8')
  for (const re of forbidden) {
    if (re.test(text)) {
      console.error('Forbidden R2 secret pattern in bundle:', file, re)
      failed = true
    }
  }
}
if (failed) process.exit(1)
console.log('OK: no R2 secret patterns in dist/')
