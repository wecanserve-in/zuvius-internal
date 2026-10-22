import { deleteApp, initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { adminEmail, adminPassword, firebaseConfig } from './env'

/**
 * Deactivates the test employees created by a run (the app has no "deactivate" button,
 * and the security rules don't allow deleting users or departments from the client).
 */
export async function deactivateTestUsers(emails: string[]): Promise<string[]> {
  const app = initializeApp(firebaseConfig, `e2e-cleanup-${Date.now()}`)
  const done: string[] = []
  try {
    await signInWithEmailAndPassword(getAuth(app), adminEmail, adminPassword)
    const db = getFirestore(app)
    for (const email of emails) {
      const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)))
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'users', d.id), { isActive: false, updatedAt: serverTimestamp() })
        done.push(email)
      }
    }
  } finally {
    await deleteApp(app)
  }
  return done
}

