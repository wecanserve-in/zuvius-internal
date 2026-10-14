import { getToken } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { auth, db, getMessagingIfSupported } from '@/lib/firebase/config'

export async function registerFcmToken(): Promise<string | null> {
  const messaging = await getMessagingIfSupported()
  if (!messaging) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    console.warn('VITE_FIREBASE_VAPID_KEY is not set')
    return null
  }

  const token = await getToken(messaging, { vapidKey })
  const user = auth.currentUser
  if (user && token) {
    await updateDoc(doc(db, 'users', user.uid), {
      fcmTokens: arrayUnion(token),
    })
  }
  return token
}
