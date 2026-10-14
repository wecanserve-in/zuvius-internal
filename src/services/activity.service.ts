import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { ActivityLog } from '@/types'

const activityCol = collection(db, 'activityLogs')

function mapLog(id: string, data: Record<string, unknown>): ActivityLog {
  return {
    id,
    actorId: String(data.actorId ?? ''),
    action: String(data.action ?? ''),
    entityType: String(data.entityType ?? ''),
    entityId: String(data.entityId ?? ''),
    metadata: data.metadata as Record<string, unknown> | undefined,
    createdAt: data.createdAt as ActivityLog['createdAt'],
  }
}

export function subscribeRecentActivity(
  onData: (logs: ActivityLog[]) => void,
  pageSize = 30,
): Unsubscribe {
  const q = query(activityCol, orderBy('createdAt', 'desc'), limit(pageSize))
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => mapLog(d.id, d.data())))
  })
}
