import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/features/auth/AuthContext'
import {
  computeDepartmentReportRows,
  computeOrgTaskSummary,
  computeStatusBreakdown,
  filterTasksByRange,
  type ReportDateRange,
} from '@/lib/reports/orgReports'
import { canViewReports } from '@/lib/permissions'
import { listDepartments } from '@/services/departments.service'
import { subscribeAllTasks } from '@/services/tasks.service'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Department, Task } from '@/types'

const RANGE_OPTIONS: { id: ReportDateRange; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'all', label: 'All time' },
]

export function ReportsPage() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [range, setRange] = useState<ReportDateRange>('30d')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile || !canViewReports(profile)) return
    return subscribeAllTasks(setTasks)
  }, [profile])

  useEffect(() => {
    void listDepartments()
      .then(setDepartments)
      .catch(() => setLoadError('Could not load departments.'))
  }, [])

  const scopedTasks = useMemo(() => filterTasksByRange(tasks, range), [tasks, range])
  const summary = useMemo(() => computeOrgTaskSummary(scopedTasks), [scopedTasks])
  const statusBreakdown = useMemo(() => computeStatusBreakdown(scopedTasks), [scopedTasks])
  const deptRows = useMemo(
    () => computeDepartmentReportRows(scopedTasks, departments),
    [scopedTasks, departments],
  )

  if (!profile || !canViewReports(profile)) {
    return <Navigate to="/" replace />
  }

  if (tasks.length === 0 && !loadError) {
    return (
      <div className="space-y-3">
        <PageHeader
          compact
          title="Reports"
          description="Organisation-wide task metrics and department performance."
        />
        <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
          No tasks yet. Reports will populate as work is created across the organisation.
        </p>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        compact
        title="Reports"
        description="Organisation-wide task metrics and department performance."
        action={
          <select
            aria-label="Date range"
            className="h-8 rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-2 text-xs"
            value={range}
            onChange={(e) => setRange(e.target.value as ReportDateRange)}
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        }
      />

      {loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">By status</h2>
        {statusBreakdown.length === 0 ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">No tasks in this range.</p>
        ) : (
          <div className="space-y-1.5">
            {statusBreakdown.map(({ status, count }) => {
              const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0
              return (
                <div key={status} className="flex items-center gap-2 text-xs">
                  <span className="w-28 capitalize text-[var(--color-muted-foreground)]">
                    {status.replace('_', ' ')}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div>
          <h2 className="text-sm font-medium">By department</h2>
          <p className="text-[10px] text-[var(--color-muted-foreground)]">
            Counts use each task&apos;s department field (ownership may differ after forwarding).
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Done</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-right">Overdue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deptRows.map((row) => (
              <TableRow key={row.departmentId}>
                <TableCell className="font-medium">{row.departmentName}</TableCell>
                <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                <TableCell className="text-right tabular-nums">{row.completed}</TableCell>
                <TableCell className="text-right tabular-nums">{row.pending}</TableCell>
                <TableCell className="text-right tabular-nums">{row.overdue}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
