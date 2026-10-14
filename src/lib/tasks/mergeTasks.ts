import type { Task } from '@/types'

/** Dedupe tasks by id; keep the newest updatedAt when duplicates appear across subscriptions. */
export function mergeTasksByUpdatedAt(chunks: Task[][]): Task[] {
  const byId = new Map<string, Task>()
  for (const chunk of chunks) {
    for (const task of chunk) {
      const prev = byId.get(task.id)
      if (!prev) {
        byId.set(task.id, task)
        continue
      }
      const prevMs = prev.updatedAt?.toMillis() ?? 0
      const nextMs = task.updatedAt?.toMillis() ?? 0
      if (nextMs >= prevMs) byId.set(task.id, task)
    }
  }
  return [...byId.values()].sort(
    (a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0),
  )
}
