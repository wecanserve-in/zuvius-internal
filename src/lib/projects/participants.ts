import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

/** Lets assignees read the parent project doc (see firestore.rules participants). */
export async function ensureProjectParticipant(
  projectId: string,
  userId: string,
  taskId: string,
): Promise<void> {
  if (!projectId || !userId || !taskId) return
  await setDoc(
    doc(db, 'projects', projectId, 'participants', userId),
    { taskId, joinedAt: serverTimestamp() },
    { merge: true },
  )
}
