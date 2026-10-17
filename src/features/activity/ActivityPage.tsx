import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthContext'
import { useManagedDepartments } from '@/hooks/useManagedDepartments'
import {
  activityLabel,
  rangeStartMs,
  type OrgActivityRow,
  type ReportDateRange,
} from '@/lib/reports/orgReports'
import { canViewReports, hasMinRole } from '@/lib/permissions'
import { subscribeRecentActivity } from '@/services/activity.service'
import { listDepartments } from '@/services/departments.service'
import { loadRecentOrgActivity } from '@/services/reports.service'
import { subscribeAllTasks, subscribeDepartmentTasks } from '@/services/tasks.service'
import { listActiveUsers, loadUsersByIds } from '@/services/users.service'
import type { ActivityLog, AppUser, Department, Task, TaskHistoryEventKind } from '@/types'

const RANGE_OPTIONS: { id: ReportDateRange; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'all', label: 'All time' },
]

const EVENT_KIND_OPTIONS: { id: '' | TaskHistoryEventKind; label: string }[] = [
  { id: '', label: 'All events' },
  { id: 'created', label: 'Created' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'forwarded', label: 'Forwarded' },
  { id: 'completed', label: 'Completed' },
]

const selectClass =
  'h-8 w-full min-w-0 flex-1 rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-2 text-xs sm:max-w-[11rem] sm:flex-none sm:w-auto'

function emptyOrgFilters() {
  return {
    range: '30d' as ReportDateRange,
    kind: '' as '' | TaskHistoryEventKind,
    departmentId: '',
    actorId: '',
    query: '',
  }
}

function emptyLogFilters() {
  return {
    range: '30d' as ReportDateRange,
    entityType: '',
    departmentId: '',
    actorId: '',
    query: '',
  }
}

export function ActivityPage() {
  const { profile } = useAuth()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [deptTasks, setDeptTasks] = useState<Task[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [orgFilters, setOrgFilters] = useState(emptyOrgFilters)
  const [logFilters, setLogFilters] = useState(emptyLogFilters)
  const [orgActivity, setOrgActivity] = useState<OrgActivityRow[]>([])
  const [orgActivityLoading, setOrgActivityLoading] = useState(false)
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())
  const [actorOptions, setActorOptions] = useState<AppUser[]>([])
  const { managed, managedIds } = useManagedDepartments()
  const isDeptAdmin = profile && !hasMinRole(profile, 'admin') && profile.role === 'department_admin'
  const showOrgTaskHistory = Boolean(profile && canViewReports(profile))

  const taskById = useMemo(() => new Map(allTasks.map((t) => [t.id, t])), [allTasks])
  const deptTaskById = useMemo(() => new Map(deptTasks.map((t) => [t.id, t])), [deptTasks])

  useEffect(() => {
    if (!showOrgTaskHistory) return
    return subscribeAllTasks(setAllTasks)
  }, [showOrgTaskHistory])

  useEffect(() => {
    if (showOrgTaskHistory) {
      void listDepartments().then(setDepartments).catch(() => setDepartments([]))
    } else if (isDeptAdmin && managed.length > 0) {
      setDepartments(managed)
    } else if (!showOrgTaskHistory) {
      void listDepartments().then(setDepartments).catch(() => setDepartments([]))
    }
  }, [showOrgTaskHistory, isDeptAdmin, managed])

  useEffect(() => {
    void listActiveUsers()
      .then(setActorOptions)
      .catch(() => setActorOptions([]))
  }, [])

  useEffect(() => {
    if (!showOrgTaskHistory) return
    setOrgActivityLoading(true)
    void loadRecentOrgActivity(allTasks, 60, 120)
      .then(setOrgActivity)
      .catch(() => setOrgActivity([]))
      .finally(() => setOrgActivityLoading(false))
  }, [allTasks, showOrgTaskHistory])

  useEffect(() => {
    if (!showOrgTaskHistory) return
    const ids = new Set(orgActivity.map((row) => row.actorId))
    if (ids.size === 0) return
    void loadUsersByIds([...ids]).then(setUsersById)
  }, [orgActivity, showOrgTaskHistory])

  useEffect(() => {
    if (showOrgTaskHistory) return
    return subscribeRecentActivity(setLogs, 80)
  }, [showOrgTaskHistory])

  useEffect(() => {
    if (!isDeptAdmin || managedIds.length === 0) return
    return subscribeDepartmentTasks(managedIds, setDeptTasks)
  }, [isDeptAdmin, managedIds.join(',')])

  const departmentOptions = useMemo(() => {
    if (showOrgTaskHistory) return departments
    if (isDeptAdmin) return managed
    return departments
  }, [showOrgTaskHistory, isDeptAdmin, departments, managed])

  const entityTypeOptions = useMemo(() => {
    const types = new Set<string>()
    for (const log of logs) {
      if (log.entityType) types.add(log.entityType)
    }
    return [...types].sort()
  }, [logs])

  const filteredOrgActivity = useMemo(() => {
    const start = rangeStartMs(orgFilters.range)
    const q = orgFilters.query.trim().toLowerCase()
    return orgActivity.filter((row) => {
      if (start != null && row.atMs < start) return false
      if (orgFilters.kind && row.kind !== orgFilters.kind) return false
      if (orgFilters.actorId && row.actorId !== orgFilters.actorId) return false
      if (orgFilters.departmentId) {
        const dept = taskById.get(row.taskId)?.departmentId
        if (dept !== orgFilters.departmentId) return false
      }
      if (q) {
        const actorName = usersById.get(row.actorId)?.displayName?.toLowerCase() ?? ''
        if (!row.taskTitle.toLowerCase().includes(q) && !actorName.includes(q)) return false
      }
      return true
    })
  }, [orgActivity, orgFilters, taskById, usersById])

  const visibleLogs = useMemo(() => {
    const start = rangeStartMs(logFilters.range)
    const q = logFilters.query.trim().toLowerCase()

    let list = logs
    if (isDeptAdmin) {
      list = list.filter(
        (log) => log.entityType !== 'task' || deptTaskById.has(log.entityId),
      )
    }

    return list.filter((log) => {
      const atMs = log.createdAt?.toMillis() ?? 0
      if (start != null && atMs > 0 && atMs < start) return false
      if (logFilters.entityType && log.entityType !== logFilters.entityType) return false
      if (logFilters.actorId && log.actorId !== logFilters.actorId) return false
      if (logFilters.departmentId && log.entityType === 'task') {
        const dept = deptTaskById.get(log.entityId)?.departmentId
        if (dept !== logFilters.departmentId) return false
      }
      if (q) {
        const hay = `${log.action} ${log.entityType} ${log.entityId}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [logs, isDeptAdmin, deptTaskById, logFilters])

  const orgFiltersActive =
    orgFilters.kind ||
    orgFilters.departmentId ||
    orgFilters.actorId ||
    orgFilters.query.trim()

  const logFiltersActive =
    logFilters.entityType ||
    logFilters.departmentId ||
    logFilters.actorId ||
    logFilters.query.trim()

  if (!profile) return null

  if (showOrgTaskHistory) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-3xl space-y-3">
        <PageHeader compact title="Activity" />

        <div className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            value={orgFilters.query}
            onChange={(e) => setOrgFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Search task or person…"
            className="h-8 w-full min-w-0 text-sm sm:max-w-xs sm:flex-1"
            aria-label="Search activity"
          />
          <select
            aria-label="Date range"
            className={selectClass}
            value={orgFilters.range}
            onChange={(e) =>
              setOrgFilters((f) => ({ ...f, range: e.target.value as ReportDateRange }))
            }
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <select
            aria-label="Event type"
            className={selectClass}
            value={orgFilters.kind}
            onChange={(e) =>
              setOrgFilters((f) => ({
                ...f,
                kind: e.target.value as '' | TaskHistoryEventKind,
              }))
            }
          >
            {EVENT_KIND_OPTIONS.map((o) => (
              <option key={o.id || 'all'} value={o.id}>{o.label}</option>
            ))}
          </select>
          <select
            aria-label="Department"
            className={selectClass}
            value={orgFilters.departmentId}
            onChange={(e) => setOrgFilters((f) => ({ ...f, departmentId: e.target.value }))}
          >
            <option value="">All departments</option>
            {departmentOptions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            aria-label="Actor"
            className={selectClass}
            value={orgFilters.actorId}
            onChange={(e) => setOrgFilters((f) => ({ ...f, actorId: e.target.value }))}
          >
            <option value="">Anyone</option>
            {actorOptions.map((u) => (
              <option key={u.id} value={u.id}>{u.displayName}</option>
            ))}
          </select>
          {orgFiltersActive ? (
            <button
              type="button"
              className="text-xs text-[var(--color-primary)] hover:underline"
              onClick={() => setOrgFilters(emptyOrgFilters())}
            >
              Clear filters
            </button>
          ) : null}
        </div>

        {orgActivityLoading ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Loading activity…</p>
        ) : filteredOrgActivity.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No events match these filters.
          </p>
        ) : (
          <ul className="divide-y rounded-md border border-[var(--color-border)] text-sm">
            {filteredOrgActivity.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {activityLabel(row.kind)} —{' '}
                    <Link
                      to={`/tasks/${row.taskId}`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      {row.taskTitle}
                    </Link>
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {usersById.get(row.actorId)?.displayName ?? 'Team member'}
                    {taskById.get(row.taskId)?.departmentId
                      ? ` · ${
                          departments.find(
                            (d) => d.id === taskById.get(row.taskId)?.departmentId,
                          )?.name ?? 'Department'
                        }`
                      : null}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                  {format(row.atMs, 'MMM d, h:mm a')}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-3">
      <PageHeader compact title="Activity" />

      <div className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          value={logFilters.query}
          onChange={(e) => setLogFilters((f) => ({ ...f, query: e.target.value }))}
          placeholder="Search activity…"
          className="h-8 w-full min-w-0 text-sm sm:max-w-xs sm:flex-1"
          aria-label="Search activity"
        />
        <select
          aria-label="Date range"
          className={selectClass}
          value={logFilters.range}
          onChange={(e) =>
            setLogFilters((f) => ({ ...f, range: e.target.value as ReportDateRange }))
          }
        >
          {RANGE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <select
          aria-label="Entity type"
          className={selectClass}
          value={logFilters.entityType}
          onChange={(e) => setLogFilters((f) => ({ ...f, entityType: e.target.value }))}
        >
          <option value="">All types</option>
          {entityTypeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {isDeptAdmin && managed.length > 1 ? (
          <select
            aria-label="Department"
            className={selectClass}
            value={logFilters.departmentId}
            onChange={(e) => setLogFilters((f) => ({ ...f, departmentId: e.target.value }))}
          >
            <option value="">All departments</option>
            {managed.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        ) : null}
        <select
          aria-label="Actor"
          className={selectClass}
          value={logFilters.actorId}
          onChange={(e) => setLogFilters((f) => ({ ...f, actorId: e.target.value }))}
        >
          <option value="">Anyone</option>
          {actorOptions.map((u) => (
            <option key={u.id} value={u.id}>{u.displayName}</option>
          ))}
        </select>
        {logFiltersActive ? (
          <button
            type="button"
            className="text-xs text-[var(--color-primary)] hover:underline"
            onClick={() => setLogFilters(emptyLogFilters())}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {visibleLogs.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">No activity matches these filters.</p>
      ) : null}
      {visibleLogs.map((log) => (
        <Card key={log.id} className="p-4 text-sm">
          <p className="font-medium">{log.action}</p>
          <p className="text-[var(--color-muted-foreground)]">
            {log.entityType}
            {log.entityType === 'task' ? (
              <>
                {' '}
                ·{' '}
                <Link className="underline" to={`/tasks/${log.entityId}`}>View task</Link>
              </>
            ) : (
              <> · {log.entityId}</>
            )}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {log.createdAt ? format(log.createdAt.toDate(), 'PPpp') : ''}
          </p>
        </Card>
      ))}
    </div>
  )
}
