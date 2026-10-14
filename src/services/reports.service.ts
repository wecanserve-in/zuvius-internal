import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { OrgActivityRow } from '@/lib/reports/orgReports'
import type { Task, TaskHistoryEventKind } from '@/types'

export async function loadRecentOrgActivity(
  tasks: Task[],
  maxTasks = 25,
  maxEvents = 20,
): Promise<OrgActivityRow[]> {
  const candidates = [...tasks]
    .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
    .slice(0, maxTasks)

  const rows: OrgActivityRow[] = []
  for (const task of candidates) {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'tasks', task.id, 'history'),
          orderBy('createdAt', 'desc'),
          limit(3),
        ),
      )
      for (const d of snap.docs) {
        const data = d.data()
        const createdAt = data.createdAt
        const atMs =
          createdAt && typeof createdAt.toMillis === 'function' ? createdAt.toMillis() : 0
        rows.push({
          id: `${task.id}-${d.id}`,
          taskId: task.id,
          taskTitle: task.title,
          kind: data.kind as TaskHistoryEventKind,
          actorId: String(data.actorId ?? ''),
          atMs,
        })
      }
    } catch {
      // History may be unreadable for a single task; skip.
    }
  }

  return rows
    .filter((r) => r.atMs > 0)
    .sort((a, b) => b.atMs - a.atMs)
    .slice(0, maxEvents)
}
