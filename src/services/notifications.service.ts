import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
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

/** Only the newest notifications are loaded — older history is never re-downloaded. */
export const NOTIFICATION_PAGE_SIZE = 100

function sortNewestFirst(items: AppNotification[]): AppNotification[] {
  return items.sort((a, b) => {
    const aMs = a.createdAt?.toMillis() ?? Number.MAX_SAFE_INTEGER
    const bMs = b.createdAt?.toMillis() ?? Number.MAX_SAFE_INTEGER
    return bMs - aMs
  })
}

function isMissingIndexError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === 'failed-precondition'
  )
}

export function subscribeNotifications(
  userId: string,
  onData: (items: AppNotification[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const handle = (docs: { id: string; data: () => Record<string, unknown> }[]) =>
    onData(sortNewestFirst(docs.map((d) => mapNotification(d.id, d.data()))).slice(0, NOTIFICATION_PAGE_SIZE))
  const reportError = (err: unknown) =>
    onError?.(err instanceof Error ? err : new Error(String(err)))

  const limited = query(
    notificationsCol,
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(NOTIFICATION_PAGE_SIZE),
  )

  let unsub: Unsubscribe = onSnapshot(
    limited,
    (snap) => handle(snap.docs),
    (err) => {
      if (!isMissingIndexError(err)) {
        reportError(err)
        return
      }
      // Index (recipientId + createdAt desc) not deployed yet — fall back to the full list.
      console.warn(
        'notifications: composite index missing, loading full history. Run `firebase deploy --only firestore:indexes`.',
      )
      unsub = onSnapshot(
        query(notificationsCol, where('recipientId', '==', userId)),
        (snap) => handle(snap.docs),
        reportError,
      )
    },
  )
  return () => unsub()
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
