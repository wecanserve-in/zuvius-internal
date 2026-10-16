import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { taskDisplayTitle } from '@/lib/tasks/taskContent'
import { overdueTaskSurfaceClass, sortTasksForDisplay } from '@/lib/tasks/sortTasks'
import { isTaskOverdue } from '@/services/tasks.service'
import type { AppUser, Department, Task } from '@/types'

const priorityVariant: Record<Task['priority'], 'secondary' | 'default' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
}

export function TaskMobileList({
  tasks,
  usersById,
  deptById,
  management = false,
  showAssignee = true,
}: {
  tasks: Task[]
  usersById?: Map<string, AppUser>
  deptById?: Map<string, Department>
  management?: boolean
  showAssignee?: boolean
}) {
  const name = (id: string) => usersById?.get(id)?.displayName ?? '—'
  const assigneeDept = (task: Task) => {
    const primary = task.assigneeIds[0]
    const user = primary ? usersById?.get(primary) : undefined
    const deptId = user?.departmentIds[0] ?? task.departmentId
    if (!deptId) return '—'
    return deptById?.get(deptId)?.name ?? deptId
  }

  const rows = sortTasksForDisplay(tasks)

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)] md:hidden">
        No tasks match your filters.
      </p>
    )
  }

  return (
    <ul className="divide-y overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] md:hidden">
      {rows.map((task) => {
        const overdue = isTaskOverdue(task)
        return (
          <li key={task.id}>
            <Link
              to={`/tasks/${task.id}`}
              className={cn(
                'flex items-center gap-2 px-3 py-3 active:bg-[var(--color-muted)]',
                overdueTaskSurfaceClass(overdue),
              )}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <p
                  className={cn(
                    'line-clamp-2 text-sm font-medium leading-snug',
                    overdue && 'text-red-900 dark:text-red-100',
                  )}
                >
                  {taskDisplayTitle(task)}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={priorityVariant[task.priority]} className="h-5 px-1.5 text-[10px] capitalize">
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p
                  className={cn(
                    'text-xs',
                    overdue
                      ? 'font-medium text-red-700 dark:text-red-300'
                      : 'text-[var(--color-muted-foreground)]',
                  )}
                >
                  {task.deadlineAt
                    ? format(task.deadlineAt.toDate(), 'MMM d, h:mm a')
                    : 'No deadline'}
                  {overdue ? ' · Overdue' : ''}
                </p>
                {management ? (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {name(task.createdBy)} → {task.assigneeIds.map((id) => name(id)).join(', ')} ·{' '}
                    {assigneeDept(task)}
                  </p>
                ) : showAssignee ? (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {task.assigneeIds.map((id) => name(id)).join(', ')}
                  </p>
                ) : null}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
