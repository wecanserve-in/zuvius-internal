import type { Task } from '@/types'

/** Share of associated tasks in `completed` status (0–100). Empty list → 0. */
export function projectProgressPercent(tasks: Task[]): number {
  if (tasks.length === 0) return 0
  const done = tasks.filter((t) => t.status === 'completed').length
  return Math.round((done / tasks.length) * 100)
}
