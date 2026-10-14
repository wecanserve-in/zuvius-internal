import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  serverTimestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { AppNotification } from '@/types'

const notificationsCol = collection(db, 'notifications')

function mapNotification(id: string, data: Record<string, unknown>): AppNotification {
  return {
    id,
    recipientId: String(data.recipientId ?? ''),
    type: data.type as AppNotification['type'],
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    entityType: data.entityType as AppNotification['entityType'],
    entityId: data.entityId ? String(data.entityId) : undefined,
    readAt: data.readAt as AppNotification['readAt'],
    createdAt: data.createdAt as AppNotification['createdAt'],
  }
}

export function subscribeNotifications(
  userId: string,
  onData: (items: AppNotification[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(notificationsCol, where('recipientId', '==', userId))
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => mapNotification(d.id, d.data()))
      items.sort((a, b) => {
        const aMs = a.createdAt?.toMillis() ?? 0
        const bMs = b.createdAt?.toMillis() ?? 0
        return bMs - aMs
      })
      onData(items)
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), {
    readAt: serverTimestamp(),
  })
}

export async function markNotificationUnread(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), {
    readAt: null,
  })
}

export async function markAllNotificationsRead(items: AppNotification[]): Promise<void> {
  const unread = items.filter((n) => !n.readAt)
  if (unread.length === 0) return
  const batch = writeBatch(db)
  for (const n of unread) {
    batch.update(doc(db, 'notifications', n.id), { readAt: serverTimestamp() })
  }
  await batch.commit()
}

export function unreadCount(notifications: AppNotification[]): number {
  return notifications.filter((n) => !n.readAt).length
}
