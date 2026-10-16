import { format } from 'date-fns'
import { ChevronRight, FolderKanban } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { ProjectRowModel } from '@/lib/tasks/partitionWork'
import type { AppUser } from '@/types'

export function ProjectTable({
  rows,
  usersById,
  compact = false,
  memberView = false,
  selectedProjectId = null,
  onProjectSelect,
  memberProjectOwnerId,
}: {
  rows: ProjectRowModel[]
  usersById?: Map<string, AppUser>
  compact?: boolean
  /** Member dashboard: no progress; tap row to expand tasks. */
  memberView?: boolean
  selectedProjectId?: string | null
  onProjectSelect?: (projectId: string) => void
  /** When set, projects created by this user show total task count. */
  memberProjectOwnerId?: string
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
        No projects in this view.
      </p>
    )
  }

  const creator = (id: string) => usersById?.get(id)?.displayName ?? '—'

  return (
    <ul className="divide-y overflow-hidden rounded-md border border-[var(--color-project-border)] bg-[var(--color-project-muted)]/80">
      {rows.map(({ project, tasks, progress }) => {
        const done = tasks.filter((t) => t.status === 'completed').length
        const total = tasks.length || project.taskCount || 0
        const selected = memberView && selectedProjectId === project.id
        const rowClass =
          'flex w-full flex-col gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-project-muted)] sm:flex-row sm:items-center'

        return (
          <li key={project.id}>
            {memberView && onProjectSelect ? (
              <button
                type="button"
                onClick={() => onProjectSelect(project.id)}
                className={cn(rowClass, selected && 'bg-[var(--color-project-muted)]')}
              >
                <RowContent
                  project={project}
                  creator={creator}
                  compact={compact}
                  memberView
                  taskCount={
                    memberProjectOwnerId && project.createdBy === memberProjectOwnerId
                      ? tasks.length || project.taskCount || 0
                      : tasks.length
                  }
                  selected={selected}
                  isOwnerProject={
                    Boolean(memberProjectOwnerId && project.createdBy === memberProjectOwnerId)
                  }
                />
              </button>
            ) : (
              <Link to={`/projects/${project.id}`} className={rowClass}>
                <RowContent
                  project={project}
                  creator={creator}
                  compact={compact}
                  done={done}
                  total={total}
                  progress={progress}
                />
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function RowContent({
  project,
  creator,
  compact,
  memberView = false,
  selected = false,
  taskCount = 0,
  isOwnerProject = false,
  done = 0,
  total = 0,
  progress = 0,
}: {
  project: ProjectRowModel['project']
  creator: (id: string) => string
  compact: boolean
  memberView?: boolean
  selected?: boolean
  taskCount?: number
  isOwnerProject?: boolean
  done?: number
  total?: number
  progress?: number
}) {
  return (
    <>
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <FolderKanban
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-project)]"
          aria-hidden
        />
        <div className="min-w-0">
          <p className={compact ? 'truncate text-sm font-semibold' : 'font-semibold'}>
            {project.title}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {memberView
              ? isOwnerProject
                ? `${taskCount} task${taskCount === 1 ? '' : 's'} in project`
                : `${taskCount} task${taskCount === 1 ? '' : 's'} for you`
              : `Project · ${creator(project.createdBy)}`}
            {!memberView && project.deadlineAt
              ? ` · Due ${format(project.deadlineAt.toDate(), compact ? 'MMM d' : 'MMM d, yyyy')}`
              : ''}
          </p>
        </div>
      </div>
      {memberView ? (
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform',
            selected && 'rotate-90 text-[var(--color-project)]',
          )}
          aria-hidden
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3 sm:w-48 sm:flex-col sm:items-stretch">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[var(--color-muted-foreground)]">
              {done}/{total || '—'} tasks
            </span>
            <span className="font-medium tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
            <div
              className="h-full bg-[var(--color-accent)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </>
  )
}
