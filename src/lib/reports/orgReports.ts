import { format, startOfDay, subDays } from 'date-fns'
import { isTaskDueToday, isTaskOverdue } from '@/services/tasks.service'
import type { Department, Task, TaskHistoryEventKind, TaskPriority, TaskStatus } from '@/types'

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

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#5f6368',
  in_progress: '#477a60',
  completed: '#188038',
  needs_revision: '#b06000',
  cancelled: '#9aa0a6',
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#9aa0a6',
  medium: '#5f6368',
  high: '#b06000',
  urgent: '#d93025',
}

export function statusChartColor(status: TaskStatus): string {
  return STATUS_COLORS[status]
}

export function priorityChartColor(priority: TaskPriority): string {
  return PRIORITY_COLORS[priority]
}

export function computePriorityBreakdown(
  tasks: Task[],
): { priority: TaskPriority; count: number }[] {
  const order: TaskPriority[] = ['urgent', 'high', 'medium', 'low']
  const counts = new Map<TaskPriority, number>()
  for (const t of tasks) {
    counts.set(t.priority, (counts.get(t.priority) ?? 0) + 1)
  }
  return order
    .map((priority) => ({ priority, count: counts.get(priority) ?? 0 }))
    .filter((x) => x.count > 0)
}

export interface DailyVolumePoint {
  dayKey: string
  label: string
  created: number
  completed: number
}

/** Daily created vs completed tasks for trend charts (inclusive of range window). */
export function computeDailyTaskVolume(
  tasks: Task[],
  range: ReportDateRange,
  maxDays = 14,
): DailyVolumePoint[] {
  const start = rangeStartMs(range)
  const end = startOfDay(new Date()).getTime()
  const daySpan =
    start === null
      ? maxDays
      : Math.min(maxDays, Math.max(1, Math.ceil((end - start) / 86400000) + 1))
  const days: DailyVolumePoint[] = []
  for (let i = daySpan - 1; i >= 0; i -= 1) {
    const day = startOfDay(subDays(new Date(), i))
    const dayStart = day.getTime()
    const dayEnd = dayStart + 86400000
    let created = 0
    let completed = 0
    for (const t of tasks) {
      const createdMs = t.createdAt?.toMillis() ?? 0
      if (createdMs >= dayStart && createdMs < dayEnd) created += 1
      if (t.status === 'completed') {
        const doneMs = t.updatedAt?.toMillis() ?? createdMs
        if (doneMs >= dayStart && doneMs < dayEnd) completed += 1
      }
    }
    days.push({
      dayKey: format(day, 'yyyy-MM-dd'),
      label: format(day, 'MMM d'),
      created,
      completed,
    })
  }
  return days
}

export function computeCompletionRate(summary: OrgTaskSummary): number {
  const denom = summary.completed + summary.pendingOrActive
  if (denom === 0) return 0
  return Math.round((summary.completed / denom) * 100)
}

export function computeDueSignals(tasks: Task[]): { dueToday: number; dueThisWeek: number } {
  const now = new Date()
  const weekEnd = now.getTime() + 7 * 86400000
  let dueToday = 0
  let dueThisWeek = 0
  for (const t of tasks) {
    if (t.status === 'completed' || t.status === 'cancelled') continue
    if (isTaskDueToday(t)) dueToday += 1
    const ms = t.deadlineAt?.toMillis()
    if (ms != null && ms >= now.getTime() && ms <= weekEnd) dueThisWeek += 1
  }
  return { dueToday, dueThisWeek }
}

export interface AssigneeLoadRow {
  userId: string
  open: number
  completed: number
}

export function computeAssigneeWorkload(
  tasks: Task[],
  limit = 8,
): AssigneeLoadRow[] {
  const map = new Map<string, { open: number; completed: number }>()
  for (const t of tasks) {
    for (const uid of t.assigneeIds) {
      const row = map.get(uid) ?? { open: 0, completed: 0 }
      if (t.status === 'completed') row.completed += 1
      else if (t.status !== 'cancelled') row.open += 1
      map.set(uid, row)
    }
  }
  return [...map.entries()]
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => b.open + b.completed - (a.open + a.completed))
    .slice(0, limit)
}

export function filterTasksForDepartments(tasks: Task[], departmentIds: string[]): Task[] {
  if (departmentIds.length === 0) return tasks
  const set = new Set(departmentIds)
  return tasks.filter((t) => t.departmentId != null && set.has(t.departmentId))
}

function taskCompletedAtMs(task: Task): number | null {
  if (task.status !== 'completed') return null
  return task.completedAt?.toMillis() ?? task.updatedAt?.toMillis() ?? null
}

function assigneeCompletedOnTime(task: Task): boolean {
  const doneMs = taskCompletedAtMs(task)
  if (doneMs == null) return false
  if (!task.deadlineAt) return true
  return doneMs <= task.deadlineAt.toMillis()
}

function assigneeCompletedEarly(task: Task): boolean {
  const doneMs = taskCompletedAtMs(task)
  if (doneMs == null || !task.deadlineAt) return false
  return doneMs < task.deadlineAt.toMillis()
}

export interface EmployeeLeaderboardRow {
  userId: string
  score: number
  completed: number
  onTime: number
  early: number
  activeDays: number
  overdueOpen: number
}

/**
 * Top performers: completions on/before deadline, consistent daily closes, no overdue backlog.
 */
export function computeEmployeeLeaderboard(
  tasks: Task[],
  limit = 5,
): EmployeeLeaderboardRow[] {
  const stats = new Map<
    string,
    {
      completed: number
      onTime: number
      early: number
      overdueOpen: number
      completionDays: Set<string>
    }
  >()

  const ensure = (uid: string) => {
    let row = stats.get(uid)
    if (!row) {
      row = {
        completed: 0,
        onTime: 0,
        early: 0,
        overdueOpen: 0,
        completionDays: new Set(),
      }
      stats.set(uid, row)
    }
    return row
  }

  for (const t of tasks) {
    if (t.status === 'cancelled') continue
    for (const uid of t.assigneeIds) {
      const row = ensure(uid)
      if (t.status === 'completed') {
        row.completed += 1
        if (assigneeCompletedOnTime(t)) row.onTime += 1
        if (assigneeCompletedEarly(t)) row.early += 1
        const doneMs = taskCompletedAtMs(t)
        if (doneMs) {
          row.completionDays.add(format(startOfDay(new Date(doneMs)), 'yyyy-MM-dd'))
        }
      } else if (isTaskOverdue(t)) {
        row.overdueOpen += 1
      }
    }
  }

  return [...stats.entries()]
    .map(([userId, s]) => {
      const activeDays = s.completionDays.size
      const score =
        s.completed * 8 +
        s.onTime * 14 +
        s.early * 6 +
        activeDays * 20 -
        s.overdueOpen * 35
      return {
        userId,
        completed: s.completed,
        onTime: s.onTime,
        early: s.early,
        activeDays,
        overdueOpen: s.overdueOpen,
        score,
      }
    })
    .filter((r) => r.completed > 0)
    .sort((a, b) => b.score - a.score || b.onTime - a.onTime || b.completed - a.completed)
    .slice(0, limit)
}
