import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/types'

const FLOW: TaskStatus[] = ['todo', 'in_progress', 'needs_revision', 'completed']

const LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  needs_revision: 'Revision',
  completed: 'Done',
  cancelled: 'Cancelled',
}

function stageIndex(status: TaskStatus): number {
  if (status === 'cancelled') return -1
  const idx = FLOW.indexOf(status)
  return idx >= 0 ? idx : 1
}

export function TaskStatusStepper({
  status,
  compact = false,
  className,
}: {
  status: TaskStatus
  compact?: boolean
  className?: string
}) {
  if (status === 'cancelled') {
    return (
      <p className={cn('text-xs text-[var(--color-muted-foreground)]', className)}>
        Cancelled
      </p>
    )
  }

  const current = stageIndex(status)

  return (
    <ol
      className={cn(
        'flex flex-wrap items-center gap-0',
        compact ? 'text-[10px]' : 'text-xs',
        className,
      )}
      aria-label="Task progress"
    >
      {FLOW.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={step} className="flex items-center">
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 font-medium whitespace-nowrap',
                done && 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
                active && 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
                !done && !active && 'border-[var(--color-border)] text-[var(--color-muted-foreground)]',
              )}
            >
              {LABELS[step]}
            </span>
            {i < FLOW.length - 1 ? (
              <span
                className={cn(
                  'mx-1 h-px w-3 sm:w-5',
                  i < current ? 'bg-emerald-500/60' : 'bg-[var(--color-border)]',
                )}
                aria-hidden
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
