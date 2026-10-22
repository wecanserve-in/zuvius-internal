import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

function assertConfig() {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID',
  ] as const
  const missing = required.filter((key) => !import.meta.env[key])
  if (missing.length > 0 && import.meta.env.PROD) {
    console.warn(`Missing Firebase env: ${missing.join(', ')}`)
  }
}

assertConfig()

export const app: FirebaseApp = initializeApp(firebaseConfig)
export const auth: Auth = getAuth(app)

/**
 * Keep Firestore data in the browser (IndexedDB) so reloads and reconnects only
 * download changes instead of re-reading everything. Falls back to memory cache.
 */
function createDb(): Firestore {
  if (typeof indexedDB === 'undefined') return getFirestore(app)
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch {
    return getFirestore(app)
  }
}

export const db: Firestore = createDb()
const functionsRegion =
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION ?? 'asia-south1'

export const functions: Functions = getFunctions(app, functionsRegion)

let messagingInstance: Messaging | null = null

export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance
  const supported = await isSupported()
  if (!supported) return null
  messagingInstance = getMessaging(app)
  return messagingInstance
}

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

export const companyTimeZone =
  import.meta.env.VITE_COMPANY_TIMEZONE ?? 'Asia/Kolkata'
