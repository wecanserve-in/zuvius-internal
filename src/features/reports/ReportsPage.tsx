import { formatDistanceToNow } from 'date-fns'
import { Activity, BarChart3, CheckCircle2, ChevronDown, Layers, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/features/auth/AuthContext'
import {
  DepartmentReportFilter,
  DepartmentSnapshot,
  DeptCompareChart,
  EmployeeLeaderboard,
  KpiCard,
  PriorityBars,
  ReportPanel,
} from '@/features/reports/ReportVisuals'
import { useManagedDepartments } from '@/hooks/useManagedDepartments'
import {
  canViewAllTasks,
  canViewReports,
  isDepartmentAdminOnly,
} from '@/lib/permissions'
import {
  activityLabel,
  computeAssigneeWorkload,
  computeCompletionRate,
  computeEmployeeLeaderboard,
  computeDepartmentReportRows,
  computeDueSignals,
  computeOrgTaskSummary,
  computePriorityBreakdown,
  filterTasksByRange,
  filterTasksForDepartments,
  type ReportDateRange,
} from '@/lib/reports/orgReports'
import { listDepartments } from '@/services/departments.service'
import { loadRecentOrgActivity } from '@/services/reports.service'
import { subscribeAllTasks, subscribeDepartmentTasks } from '@/services/tasks.service'
import { loadUsersByIds } from '@/services/users.service'
import type { Department, Task } from '@/types'
import { cn } from '@/lib/utils'

const RANGE_OPTIONS: { id: ReportDateRange; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'all', label: 'All time' },
]

export function ReportsPage() {
  const { profile } = useAuth()
  const { managedIds } = useManagedDepartments()
  const [tasks, setTasks] = useState<Task[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [range, setRange] = useState<ReportDateRange>('30d')
  const [departmentFilterId, setDepartmentFilterId] = useState('')
  const [matrixOpen, setMatrixOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activity, setActivity] = useState<
    Awaited<ReturnType<typeof loadRecentOrgActivity>>
  >([])
  const [usersById, setUsersById] = useState<Map<string, { displayName: string }>>(new Map())

  const orgWide = Boolean(profile && canViewAllTasks(profile))
  const deptAdminOnly = Boolean(profile && isDepartmentAdminOnly(profile))
  useEffect(() => {
    if (!profile || !canViewReports(profile)) return
    if (orgWide) return subscribeAllTasks(setTasks)
    return subscribeDepartmentTasks(managedIds, setTasks)
  }, [profile, orgWide, managedIds.join(',')])

  useEffect(() => {
    void listDepartments()
      .then(setDepartments)
      .catch(() => setLoadError('Could not load departments.'))
  }, [])

  const visibleDepartments = useMemo(() => {
    if (orgWide) return departments
    const set = new Set(managedIds)
    return departments.filter((d) => set.has(d.id))
  }, [departments, orgWide, managedIds.join(',')])

  const departmentFilterOptions = useMemo(() => {
    const list = orgWide ? departments : visibleDepartments
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [orgWide, departments, visibleDepartments])

  const managedDeptSet = useMemo(() => new Set(managedIds), [managedIds.join(',')])

  const autoSingleDeptId =
    deptAdminOnly && visibleDepartments.length === 1
      ? visibleDepartments[0]?.id ?? ''
      : ''

  const activeDepartmentId = departmentFilterId || autoSingleDeptId

  const showDepartmentFilter =
    (deptAdminOnly && visibleDepartments.length > 1) ||
    (orgWide && departmentFilterOptions.length > 0)

  const scopedTasks = useMemo(() => {
    let list = filterTasksByRange(tasks, range)
    if (!activeDepartmentId) return list
    if (deptAdminOnly && !managedDeptSet.has(activeDepartmentId)) return list
    return filterTasksForDepartments(list, [activeDepartmentId])
  }, [tasks, range, activeDepartmentId, deptAdminOnly, managedDeptSet])

  const summary = useMemo(() => computeOrgTaskSummary(scopedTasks), [scopedTasks])
  const priorityBreakdown = useMemo(() => computePriorityBreakdown(scopedTasks), [scopedTasks])
  const singleDeptView = Boolean(activeDepartmentId)

  const departmentsForCharts = useMemo(() => {
    if (singleDeptView && activeDepartmentId) {
      const pool = orgWide ? departments : visibleDepartments
      return pool.filter((d) => d.id === activeDepartmentId)
    }
    return visibleDepartments
  }, [
    orgWide,
    departments,
    visibleDepartments,
    singleDeptView,
    activeDepartmentId,
  ])

  const deptRows = useMemo(
    () => computeDepartmentReportRows(scopedTasks, departmentsForCharts),
    [scopedTasks, departmentsForCharts],
  )

  const selectedDeptRow = singleDeptView ? deptRows[0] : undefined
  const employeeLeaderboard = useMemo(
    () => computeEmployeeLeaderboard(scopedTasks, 5),
    [scopedTasks],
  )
  const completionRate = useMemo(() => computeCompletionRate(summary), [summary])
  const dueSignals = useMemo(() => computeDueSignals(scopedTasks), [scopedTasks])
  const assigneeLoad = useMemo(() => computeAssigneeWorkload(scopedTasks, 8), [scopedTasks])

  const matrixRows = useMemo(
    () => (singleDeptView ? [] : computeDepartmentReportRows(scopedTasks, visibleDepartments)),
    [scopedTasks, visibleDepartments, singleDeptView],
  )

  useEffect(() => {
    if (scopedTasks.length === 0) {
      setActivity([])
      return
    }
    void loadRecentOrgActivity(scopedTasks, 15, 12).then(setActivity)
  }, [scopedTasks])

  useEffect(() => {
    const ids = [
      ...assigneeLoad.map((r) => r.userId),
      ...employeeLeaderboard.map((r) => r.userId),
      ...activity.map((a) => a.actorId),
    ]
    void loadUsersByIds(ids).then((map) => {
      const slim = new Map<string, { displayName: string }>()
      map.forEach((u, id) => slim.set(id, { displayName: u.displayName }))
      setUsersById(slim)
    })
  }, [assigneeLoad, employeeLeaderboard, activity])

  if (!profile || !canViewReports(profile)) {
    return <Navigate to="/" replace />
  }

  if (tasks.length === 0 && !loadError) {
    return (
      <div className="space-y-3">
        <PageHeader compact title="Reports" />
        <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
          No tasks yet. Reports will populate as work is created
          {deptAdminOnly ? ' in your departments' : ' across the organisation'}.
        </p>
      </div>
    )
  }

  const activeDeptName = activeDepartmentId
    ? departmentFilterOptions.find((d) => d.id === activeDepartmentId)?.name ??
      visibleDepartments.find((d) => d.id === activeDepartmentId)?.name
    : undefined

  const scopeLabel = activeDeptName
    ? `${activeDeptName} · department report`
    : deptAdminOnly
      ? `My departments · ${visibleDepartments.length} team${visibleDepartments.length === 1 ? '' : 's'}`
      : 'Organisation-wide intelligence'

  return (
    <div className="min-w-0 space-y-3 pb-4">
      {showDepartmentFilter ? (
        <DepartmentReportFilter
          departments={departmentFilterOptions}
          value={departmentFilterId}
          onChange={setDepartmentFilterId}
          allLabel={deptAdminOnly ? 'All my departments' : 'All departments'}
        />
      ) : null}

      <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-sm">
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-[var(--color-primary)]">
              <Sparkles className="h-3 w-3" aria-hidden />
              Analytics
            </p>
            <PageHeader compact title="Reports" className="mb-0" />
            <p className="text-[10px] text-[var(--color-muted-foreground)]">{scopeLabel}</p>
          </div>
          <select
            aria-label="Date range"
            className="h-8 rounded-md border border-[var(--color-input)] bg-[var(--color-card)]/90 px-2 text-[10px] font-medium"
            value={range}
            onChange={(e) => setRange(e.target.value as ReportDateRange)}
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loadError ? (
        <p className="surface-danger rounded-md px-2 py-1.5 text-xs">
          {loadError}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard compact label="Total" value={summary.total} accent="primary" />
        <KpiCard
          compact
          label="Done"
          value={summary.completed}
          accent="success"
          hint={`${completionRate}%`}
        />
        <KpiCard compact label="Active" value={summary.pendingOrActive} accent="info" />
        <KpiCard compact label="Overdue" value={summary.overdue} accent="destructive" />
        <KpiCard compact label="Due today" value={dueSignals.dueToday} accent="warning" />
      </div>

      <div className="grid gap-2 lg:grid-cols-12">
        <div className="flex flex-col gap-2 lg:col-span-3">
          <ReportPanel compact title="Priority" subtitle="By urgency">
            {priorityBreakdown.length === 0 ? (
              <p className="text-[10px] text-[var(--color-muted-foreground)]">No tasks.</p>
            ) : (
              <PriorityBars rows={priorityBreakdown} />
            )}
          </ReportPanel>
          <ReportPanel compact title="Live pulse" subtitle="Latest events">
            {activity.length === 0 ? (
              <p className="text-[10px] text-[var(--color-muted-foreground)]">No activity.</p>
            ) : (
              <ul className="max-h-28 space-y-1 overflow-y-auto pr-0.5 text-[10px]">
                {activity.slice(0, 5).map((ev) => (
                  <li
                    key={ev.id}
                    className="flex gap-1.5 rounded border border-[var(--color-border)]/50 px-1.5 py-1"
                  >
                    <Activity className="mt-0.5 h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        <Link
                          to={`/tasks/${ev.taskId}`}
                          className="text-[var(--color-primary)] hover:underline"
                        >
                          {ev.taskTitle}
                        </Link>
                      </p>
                      <p className="text-[9px] text-[var(--color-muted-foreground)]">
                        {activityLabel(ev.kind)} ·{' '}
                        {formatDistanceToNow(new Date(ev.atMs), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ReportPanel>
        </div>

        {singleDeptView ? (
          <ReportPanel
            compact
            title="Department"
            subtitle="This team only"
            className="lg:col-span-4"
          >
            {selectedDeptRow ? (
              <DepartmentSnapshot row={selectedDeptRow} />
            ) : (
              <p className="text-[10px] text-[var(--color-muted-foreground)]">No tasks for this department.</p>
            )}
          </ReportPanel>
        ) : (
          <ReportPanel
            compact
            title="Departments"
            subtitle="Done vs active"
            className="lg:col-span-4"
          >
            {deptRows.filter((r) => r.total > 0).length === 0 ? (
              <p className="text-[10px] text-[var(--color-muted-foreground)]">No data.</p>
            ) : (
              <DeptCompareChart rows={deptRows.filter((r) => r.total > 0)} />
            )}
          </ReportPanel>
        )}

        <ReportPanel
          compact
          title="Leaderboard"
          subtitle={
            singleDeptView
              ? 'Top 5 in this department'
              : 'Top 5 — on-time finishes, daily momentum, no overdue'
          }
          className={singleDeptView ? 'lg:col-span-5' : 'lg:col-span-5'}
        >
          <EmployeeLeaderboard
            rows={employeeLeaderboard}
            nameByUserId={
              new Map(
                [...usersById.entries()].map(([id, u]) => [id, u.displayName]),
              )
            }
          />
        </ReportPanel>

        <ReportPanel
          compact
          title="Assignee load"
          subtitle="Who is carrying the work"
          className="lg:col-span-12"
        >
          {assigneeLoad.length === 0 ? (
            <p className="text-[10px] text-[var(--color-muted-foreground)]">No assignees.</p>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {assigneeLoad.map((row, i) => {
                const total = row.open + row.completed
                const max = assigneeLoad[0]
                  ? assigneeLoad[0].open + assigneeLoad[0].completed
                  : 1
                const name = usersById.get(row.userId)?.displayName ?? row.userId.slice(0, 8)
                return (
                  <div key={row.userId} className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-3 tabular-nums text-[var(--color-muted-foreground)]">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--color-muted)]/60 sm:w-24">
                      <div className="flex h-full" style={{ width: `${(total / max) * 100}%` }}>
                        <div
                          className="fill-success"
                          style={{
                            width: `${total > 0 ? (row.completed / total) * 100 : 0}%`,
                          }}
                        />
                        <div
                          className="bg-[var(--color-primary)]"
                          style={{ width: `${total > 0 ? (row.open / total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-right tabular-nums text-[var(--color-muted-foreground)]">
                      {row.open} open
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </ReportPanel>
      </div>

      {!singleDeptView ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
          <button
            type="button"
            onClick={() => setMatrixOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-medium hover:bg-[var(--color-muted)]/30"
          >
            <span>Department matrix</span>
            <span className="flex items-center gap-1 text-[10px] font-normal text-[var(--color-muted-foreground)]">
              {matrixOpen ? 'Hide' : 'Show'} full table
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', matrixOpen && 'rotate-180')}
              />
            </span>
          </button>
          {matrixOpen ? (
            <div className="border-t border-[var(--color-border)] px-2 pb-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 text-xs">Department</TableHead>
                    <TableHead className="h-8 text-right text-xs">Total</TableHead>
                    <TableHead className="h-8 text-right text-xs">Done</TableHead>
                    <TableHead className="h-8 text-right text-xs">Pending</TableHead>
                    <TableHead className="h-8 text-right text-xs">Overdue</TableHead>
                    <TableHead className="h-8 text-right text-xs">Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrixRows
                    .filter((row) => row.total > 0)
                    .map((row) => {
                      const health =
                        row.total === 0 ? '—' : `${Math.round((row.completed / row.total) * 100)}%`
                      return (
                        <TableRow key={row.departmentId}>
                          <TableCell className="py-2 text-xs font-medium">{row.departmentName}</TableCell>
                          <TableCell className="py-2 text-right text-xs tabular-nums">{row.total}</TableCell>
                          <TableCell className="py-2 text-right text-xs tabular-nums text-success dark:text-success">
                            {row.completed}
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs tabular-nums">{row.pending}</TableCell>
                          <TableCell className="py-2 text-right text-xs tabular-nums text-danger dark:text-danger">
                            {row.overdue}
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs tabular-nums font-medium">
                            {health}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[10px] text-[var(--color-muted-foreground)]">
          <BarChart3 className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
          Range uses last task activity.
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[10px] text-[var(--color-muted-foreground)]">
          <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
          {singleDeptView
            ? deptAdminOnly
              ? 'One department — choose All my departments to compare yours.'
              : 'One department — choose All departments to compare teams.'
            : deptAdminOnly
              ? 'Filter by a department you manage.'
              : 'Pick a department above to drill in.'}
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[10px] text-[var(--color-muted-foreground)]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
          Employee leaderboard favours on-time daily completions.
        </div>
      </div>
    </div>
  )
}
