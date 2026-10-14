import { isTaskOverdue } from '@/services/tasks.service'
import type { Department, Task, TaskHistoryEventKind, TaskStatus } from '@/types'

export type ReportDateRange = '7d' | '30d' | '90d' | 'all'

export function rangeStartMs(range: ReportDateRange): number | null {
  if (range === 'all') return null
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return Date.now() - days * 24 * 60 * 60 * 1000
}

export function filterTasksByRange(tasks: Task[], range: ReportDateRange): Task[] {
  const start = rangeStartMs(range)
  if (start === null) return tasks
  return tasks.filter((t) => {
    const ms = t.updatedAt?.toMillis() ?? t.createdAt?.toMillis() ?? 0
    return ms >= start
  })
}

export interface OrgTaskSummary {
  total: number
  completed: number
  pendingOrActive: number
  overdue: number
}

export function computeOrgTaskSummary(tasks: Task[]): OrgTaskSummary {
  let completed = 0
  let pendingOrActive = 0
  let overdue = 0
  for (const t of tasks) {
    if (t.status === 'completed') {
      completed += 1
      continue
    }
    if (t.status === 'cancelled') continue
    pendingOrActive += 1
    if (isTaskOverdue(t)) overdue += 1
  }
  return { total: tasks.length, completed, pendingOrActive, overdue }
}

export function computeStatusBreakdown(tasks: Task[]): { status: TaskStatus; count: number }[] {
  const counts = new Map<TaskStatus, number>()
  for (const t of tasks) {
    counts.set(t.status, (counts.get(t.status) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
}

export interface DepartmentReportRow {
  departmentId: string
  departmentName: string
  total: number
  completed: number
  pending: number
  overdue: number
}

export function computeDepartmentReportRows(
  tasks: Task[],
  departments: Department[],
): DepartmentReportRow[] {
  const byDept = new Map<string, Task[]>()
  for (const t of tasks) {
    const id = t.departmentId ?? '_none'
    const list = byDept.get(id) ?? []
    list.push(t)
    byDept.set(id, list)
  }

  const rows: DepartmentReportRow[] = departments.map((d) => {
    const list = byDept.get(d.id) ?? []
    let completed = 0
    let pending = 0
    let overdue = 0
    for (const t of list) {
      if (t.status === 'completed') completed += 1
      else if (t.status !== 'cancelled') {
        pending += 1
        if (isTaskOverdue(t)) overdue += 1
      }
    }
    return {
      departmentId: d.id,
      departmentName: d.name,
      total: list.length,
      completed,
      pending,
      overdue,
    }
  })

  const unassigned = byDept.get('_none') ?? []
  if (unassigned.length > 0) {
    let completed = 0
    let pending = 0
    let overdue = 0
    for (const t of unassigned) {
      if (t.status === 'completed') completed += 1
      else if (t.status !== 'cancelled') {
        pending += 1
        if (isTaskOverdue(t)) overdue += 1
      }
    }
    rows.push({
      departmentId: '_none',
      departmentName: 'No department',
      total: unassigned.length,
      completed,
      pending,
      overdue,
    })
  }

  return rows.sort((a, b) => b.total - a.total)
}

export interface OrgActivityRow {
  id: string
  taskId: string
  taskTitle: string
  kind: TaskHistoryEventKind
  actorId: string
  atMs: number
}

export function activityLabel(kind: TaskHistoryEventKind): string {
  if (kind === 'created') return 'Task created'
  if (kind === 'assigned') return 'Task assigned'
  if (kind === 'forwarded') return 'Task forwarded'
  return 'Task completed'
}
