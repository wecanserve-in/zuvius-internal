// One-off: dump Firestore (everything the admin can read) to backups/firestore-<time>.json
import { readFileSync, writeFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, getFirestore } from 'firebase/firestore'

function env(file) {
  const out = {}
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}
const app = env('.env.local')
const e2e = env('.env.e2e.local')

const fb = initializeApp({
  apiKey: app.VITE_FIREBASE_API_KEY,
  authDomain: app.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: app.VITE_FIREBASE_PROJECT_ID,
  appId: app.VITE_FIREBASE_APP_ID,
})
const cred = await signInWithEmailAndPassword(getAuth(fb), e2e.E2E_ADMIN_EMAIL, e2e.E2E_ADMIN_PASSWORD)
const db = getFirestore(fb)

const TOP = ['users', 'departments', 'tasks', 'projects', 'conversations', 'notifications', 'activityLogs', 'taskIdCounters', 'uploads', 'reminderEvents']
const SUB = {
  tasks: ['assignees', 'history', 'comments'],
  projects: ['participants'],
  conversations: ['messages', 'reads'],
}

const dump = { adminUid: cred.user.uid, exportedAt: new Date().toISOString(), collections: {} }
for (const name of TOP) {
  try {
    const snap = await getDocs(collection(db, name))
    const docs = {}
    for (const d of snap.docs) {
      const entry = { data: d.data() }
      for (const sub of SUB[name] ?? []) {
        try {
          const s = await getDocs(collection(db, name, d.id, sub))
          if (!s.empty) entry[sub] = Object.fromEntries(s.docs.map((x) => [x.id, x.data()]))
        } catch (err) {
          entry[`${sub}_error`] = err.code ?? String(err)
        }
      }
      docs[d.id] = entry
    }
    dump.collections[name] = docs
    console.log(`${name}: ${snap.size}`)
  } catch (err) {
    console.log(`${name}: not readable (${err.code ?? err})`)
  }
}
const file = `backups/firestore-${Date.now()}.json`
writeFileSync(file, JSON.stringify(dump, (k, v) => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v), 2))
console.log(`ADMIN_UID=${cred.user.uid}`)
console.log(`saved ${file}`)
process.exit(0)
