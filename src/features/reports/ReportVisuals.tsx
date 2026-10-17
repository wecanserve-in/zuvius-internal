import { cn } from '@/lib/utils'
import {
  priorityChartColor,
  statusChartColor,
  type DailyVolumePoint,
} from '@/lib/reports/orgReports'
import type { DepartmentReportRow } from '@/lib/reports/orgReports'
import type { TaskPriority, TaskStatus } from '@/types'

export function ReportPanel({
  title,
  subtitle,
  className,
  compact,
  children,
}: {
  title: string
  subtitle?: string
  className?: string
  compact?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm',
        compact ? 'p-2.5' : 'p-4',
        className,
      )}
    >
      {!compact ? (
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--color-primary)]/5 blur-2xl" />
      ) : null}
      <header className={cn('relative', compact ? 'mb-2' : 'mb-3')}>
        <h3 className={cn('font-semibold tracking-tight', compact ? 'text-xs' : 'text-sm')}>
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-[9px] text-[var(--color-muted-foreground)]">{subtitle}</p>
        ) : null}
      </header>
      <div className="relative">{children}</div>
    </section>
  )
}

export function DepartmentReportFilter({
  departments,
  value,
  onChange,
  allLabel = 'All departments',
}: {
  departments: { id: string; name: string }[]
  value: string
  onChange: (departmentId: string) => void
  allLabel?: string
}) {
  return (
    <div className="-mx-0.5 overflow-x-auto px-0.5 pb-1 [scrollbar-width:thin]">
      <div className="flex min-w-max gap-1">
        <button
          type="button"
          onClick={() => onChange('')}
          className={cn(
            'shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
            value === ''
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
          )}
        >
          {allLabel}
        </button>
        {departments.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onChange(d.id)}
            className={cn(
              'shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
              value === d.id
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            )}
          >
            {d.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export function KpiCard({
  label,
  value,
  hint,
  accent,
  compact,
}: {
  label: string
  value: string | number
  hint?: string
  accent: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted'
  compact?: boolean
}) {
  const ring: Record<string, string> = {
    primary: 'from-[var(--color-primary)]/12 to-transparent border-[var(--color-primary)]/22',
    success: 'from-[var(--color-success)]/15 to-transparent border-[var(--color-success)]/30',
    warning: 'from-[var(--color-warning)]/18 to-transparent border-[var(--color-warning)]/32',
    destructive:
      'from-[var(--color-destructive)]/15 to-transparent border-[var(--color-destructive)]/30',
    info: 'from-[var(--color-info)]/12 to-transparent border-[var(--color-info)]/25',
    muted: 'from-[var(--color-muted)]/80 to-transparent border-[var(--color-border)]',
  }
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border bg-gradient-to-br',
        compact ? 'p-2' : 'p-4',
        ring[accent],
      )}
    >
      <p className="text-[9px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p
        className={cn(
          'font-bold tabular-nums tracking-tight',
          compact ? 'mt-0.5 text-lg leading-tight' : 'mt-1 text-2xl',
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[9px] leading-tight text-[var(--color-muted-foreground)]">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function ConicDonut({
  segments,
  centerLabel,
  centerSub,
}: {
  segments: { value: number; color: string; label: string }[]
  centerLabel: string
  centerSub?: string
}) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total === 0) {
    return (
      <p className="py-8 text-center text-xs text-[var(--color-muted-foreground)]">No data</p>
    )
  }
  let cursor = 0
  const stops = segments.map((seg) => {
    const pct = (seg.value / total) * 100
    const from = cursor
    cursor += pct
    return `${seg.color} ${from}% ${cursor}%`
  })
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
      <div
        className="relative h-36 w-36 shrink-0 rounded-full p-[10px]"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
      >
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[var(--color-card)] text-center">
          <span className="text-xl font-bold tabular-nums">{centerLabel}</span>
          {centerSub ? (
            <span className="text-[10px] text-[var(--color-muted-foreground)]">{centerSub}</span>
          ) : null}
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: seg.color }} />
            <span className="flex-1 capitalize text-[var(--color-muted-foreground)]">{seg.label}</span>
            <span className="tabular-nums font-medium">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function StatusDonut({
  breakdown,
  total,
}: {
  breakdown: { status: TaskStatus; count: number }[]
  total: number
}) {
  const segments = breakdown.map((b) => ({
    value: b.count,
    color: statusChartColor(b.status),
    label: b.status.replace('_', ' '),
  }))
  return (
    <ConicDonut segments={segments} centerLabel={String(total)} centerSub="tasks" />
  )
}

export function PriorityBars({
  rows,
}: {
  rows: { priority: TaskPriority; count: number }[]
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.priority} className="space-y-1">
          <div className="flex justify-between text-[10px] capitalize">
            <span className="text-[var(--color-muted-foreground)]">{r.priority}</span>
            <span className="tabular-nums font-medium">{r.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted)]/60">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(r.count / max) * 100}%`,
                background: priorityChartColor(r.priority),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TrendAreaChart({ points }: { points: DailyVolumePoint[] }) {
  const max = Math.max(1, ...points.flatMap((p) => [p.created, p.completed]))
  const w = 320
  const h = 120
  const pad = 8
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0

  const toY = (v: number) => h - pad - (v / max) * (h - pad * 2)
  const createdPath = points
    .map((p, i) => `${pad + i * step},${toY(p.created)}`)
    .join(' ')
  const completedPath = points
    .map((p, i) => `${pad + i * step},${toY(p.completed)}`)
    .join(' ')

  const areaCreated =
    points.length > 0
      ? `M ${pad},${h - pad} ${points
          .map((p, i) => `L ${pad + i * step},${toY(p.created)}`)
          .join(' ')} L ${pad + (points.length - 1) * step},${h - pad} Z`
      : ''

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[280px] max-h-[140px]">
        <defs>
          <linearGradient id="report-created-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaCreated ? <path d={areaCreated} fill="url(#report-created-fill)" /> : null}
        <polyline
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={createdPath}
        />
        <polyline
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={completedPath}
        />
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-[var(--color-muted-foreground)]">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-full bg-[var(--color-primary)]" />
          Created
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-full fill-success" />
          Completed
        </span>
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-[var(--color-muted-foreground)]">
        {points.length > 0 ? (
          <>
            <span>{points[0]?.label}</span>
            <span>{points[points.length - 1]?.label}</span>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function DeptCompareChart({
  rows,
}: {
  rows: {
    departmentName: string
    completed: number
    pending: number
    overdue: number
  }[]
}) {
  const top = rows.slice(0, 6)
  return (
    <div className="space-y-3">
      {top.map((row) => {
        const total = row.completed + row.pending
        const donePct = total > 0 ? (row.completed / total) * 100 : 0
        const pendingPct = total > 0 ? (row.pending / total) * 100 : 0
        return (
          <div key={row.departmentName} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium">{row.departmentName}</span>
              <span className="shrink-0 tabular-nums text-[var(--color-muted-foreground)]">
                {total}
                {row.overdue > 0 ? (
                  <span className="ml-1 text-danger">· {row.overdue} late</span>
                ) : null}
              </span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-muted)]/50">
              <div className="fill-success transition-all" style={{ width: `${donePct}%` }} />
              <div
                className="bg-[var(--color-primary)]/70 transition-all"
                style={{ width: `${pendingPct}%` }}
              />
            </div>
            <p className="text-[9px] text-[var(--color-muted-foreground)]">
              {Math.round(donePct)}% done · {Math.round(pendingPct)}% active
            </p>
          </div>
        )
      })}
    </div>
  )
}

export function DepartmentSnapshot({ row }: { row: DepartmentReportRow }) {
  const health = row.total === 0 ? '—' : `${Math.round((row.completed / row.total) * 100)}%`
  const donePct = row.total > 0 ? (row.completed / row.total) * 100 : 0
  const pendingPct = row.total > 0 ? (row.pending / row.total) * 100 : 0
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold">{row.departmentName}</p>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--color-muted)]/50">
        <div className="fill-success" style={{ width: `${donePct}%` }} />
        <div className="bg-[var(--color-primary)]/70" style={{ width: `${pendingPct}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
        <div className="rounded-md border border-[var(--color-border)]/60 px-2 py-1.5">
          <p className="text-[var(--color-muted-foreground)]">Total</p>
          <p className="text-base font-bold tabular-nums">{row.total}</p>
        </div>
        <div className="rounded-md border border-[var(--color-border)]/60 px-2 py-1.5">
          <p className="text-[var(--color-muted-foreground)]">Done</p>
          <p className="text-base font-bold tabular-nums text-success">
            {row.completed}
          </p>
        </div>
        <div className="rounded-md border border-[var(--color-border)]/60 px-2 py-1.5">
          <p className="text-[var(--color-muted-foreground)]">Active</p>
          <p className="text-base font-bold tabular-nums">{row.pending}</p>
        </div>
        <div className="rounded-md border border-[var(--color-border)]/60 px-2 py-1.5">
          <p className="text-[var(--color-muted-foreground)]">Overdue</p>
          <p className="text-base font-bold tabular-nums text-danger">
            {row.overdue}
          </p>
        </div>
      </div>
      <p className="text-[9px] text-[var(--color-muted-foreground)]">Health {health}</p>
    </div>
  )
}

export function EmployeeLeaderboard({
  rows,
  nameByUserId,
}: {
  rows: {
    userId: string
    completed: number
    onTime: number
    early: number
    activeDays: number
    overdueOpen: number
    score: number
  }[]
  nameByUserId: Map<string, string>
}) {
  const medals = ['ðŸ¥‡', 'ðŸ¥ˆ', 'ðŸ¥‰']
  return (
    <div className="space-y-1.5">
      {rows.length === 0 ? (
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          No completions in this range yet.
        </p>
      ) : (
        rows.map((row, i) => {
          const name = nameByUserId.get(row.userId) ?? 'Employee'
          return (
            <div
              key={row.userId}
              className="flex items-center gap-2 rounded-md border border-[var(--color-border)]/60 bg-[var(--color-muted)]/15 px-2 py-1.5 text-[10px]"
            >
              <span className="w-5 shrink-0 text-center font-semibold tabular-nums">
                {i < 3 ? medals[i] : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{name}</p>
                <p className="text-[9px] text-[var(--color-muted-foreground)]">
                  {row.onTime} on time
                  {row.early > 0 ? ` · ${row.early} early` : ''}
                  {row.activeDays > 0 ? ` · ${row.activeDays} active days` : ''}
                  {row.overdueOpen > 0 ? (
                    <span className="text-danger"> · {row.overdueOpen} overdue</span>
                  ) : (
                    ' · no overdue'
                  )}
                </p>
              </div>
              <span className="shrink-0 tabular-nums font-semibold text-[var(--color-primary)]">
                {row.completed}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}

export function CompletionGauge({ rate, compact }: { rate: number; compact?: boolean }) {
  const clamped = Math.min(100, Math.max(0, rate))
  const outer = compact ? 'h-20 w-20' : 'h-28 w-28'
  const inner = compact ? 'h-14 w-14' : 'h-[4.5rem] w-[4.5rem]'
  return (
    <div className={cn('flex flex-col items-center', compact ? 'py-0' : 'py-2')}>
      <div
        className={cn('relative flex items-center justify-center rounded-full', outer)}
        style={{
          background: `conic-gradient(var(--color-primary) ${clamped}%, var(--color-muted) ${clamped}% 100%)`,
        }}
      >
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-full bg-[var(--color-card)]',
            inner,
          )}
        >
          <span className={cn('font-bold tabular-nums', compact ? 'text-base' : 'text-2xl')}>
            {clamped}%
          </span>
          {!compact ? (
            <span className="text-[9px] text-[var(--color-muted-foreground)]">done</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
