import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const forbidden = [
  /R2_SECRET_ACCESS_KEY/i,
  /VITE_R2_SECRET/i,
  /VITE_R2_ACCESS_KEY_ID/i,
  /53bde082bf70203304f933f5ed37fee4/,
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
