import { format } from 'date-fns'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { taskDisplayTitle } from '@/lib/tasks/taskContent'
import { overdueTaskSurfaceClass, sortTasksForDisplay } from '@/lib/tasks/sortTasks'
import { isTaskOverdue } from '@/services/tasks.service'
import { TaskMobileList } from '@/components/tasks/TaskMobileList'
import { TaskQuickCompleteButton } from '@/components/tasks/TaskQuickCompleteButton'
import type { AppUser, Department, Task } from '@/types'

const priorityVariant: Record<Task['priority'], 'secondary' | 'default' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
}

export function TaskTable({
  tasks,
  usersById,
  deptById,
  management = false,
  compact = false,
  showAssignee = true,
  quickCompleteActor,
}: {
  tasks: Task[]
  usersById?: Map<string, AppUser>
  deptById?: Map<string, Department>
  management?: boolean
  compact?: boolean
  showAssignee?: boolean
  /** When set, assignees see a one-tap complete control on each row. */
  quickCompleteActor?: AppUser | null
}) {
  const name = (id: string) => usersById?.get(id)?.displayName ?? '—'
  const assigneeDept = (task: Task) => {
    const primary = task.assigneeIds[0]
    const user = primary ? usersById?.get(primary) : undefined
    const deptId = user?.departmentIds[0] ?? task.departmentId
    if (!deptId) return '—'
    return deptById?.get(deptId)?.name ?? deptId
  }

  const rows = useMemo(() => sortTasksForDisplay(tasks), [tasks])
  const showPeople = Boolean(usersById) && (showAssignee || management)

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
        No tasks match your filters.
      </p>
    )
  }

  const cellMuted = cn(
    'text-[var(--color-muted-foreground)]',
    compact && 'text-xs',
  )

  const cellPad = compact ? 'px-2 py-1.5 align-top' : 'align-top'

  return (
    <div className="max-w-full min-w-0">
      <TaskMobileList
        tasks={rows}
        usersById={usersById}
        deptById={deptById}
        management={management}
        showAssignee={showAssignee}
        quickCompleteActor={quickCompleteActor}
      />
      <Table
        className={cn('hidden md:table table-fixed', compact ? 'text-xs' : undefined)}
      >
        <TableHeader>
          <TableRow className={compact ? 'hover:bg-transparent' : undefined}>
            <TableHead className={cn('w-[7.5rem]', compact && 'h-8 px-2')}>Task ID</TableHead>
            <TableHead className={cn('w-[22%]', compact && 'h-8 px-2')}>Task</TableHead>
            {showPeople ? (
              <>
                <TableHead className={cn('w-[11%]', compact && 'h-8 px-2')}>Assigned by</TableHead>
                {showAssignee || management ? (
                  <TableHead className={cn('w-[12%]', compact && 'h-8 px-2')}>Assigned to</TableHead>
                ) : null}
              </>
            ) : null}
            {management ? (
              <TableHead className={cn('w-[9%]', compact && 'h-8 px-2')}>Dept</TableHead>
            ) : null}
            <TableHead className={cn('w-[5.5rem]', compact && 'h-8 px-2')}>Priority</TableHead>
            <TableHead className={cn('w-[8.5rem]', compact && 'h-8 px-2')}>Deadline</TableHead>
            <TableHead className={cn('w-[5.5rem]', compact && 'h-8 px-2')}>Status</TableHead>
            {management ? (
              <TableHead className={cn('w-[5rem]', compact && 'h-8 px-2')}>Updated</TableHead>
            ) : null}
            {quickCompleteActor ? (
              <TableHead
                className={cn('w-11 shrink-0', compact && 'h-8 px-1')}
                aria-label="Mark complete"
              >
                <span className="sr-only">Done</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((task) => {
            const overdue = isTaskOverdue(task)
            return (
            <TableRow key={task.id} className={overdueTaskSurfaceClass(overdue)}>
              <TableCell className={cn(cellPad, 'font-mono text-[10px] sm:text-xs')}>
                {task.businessTaskId ?? '—'}
              </TableCell>
              <TableCell className={cellPad}>
                <Link
                  to={`/tasks/${task.id}`}
                  className={cn(
                    'block whitespace-normal break-words font-medium leading-snug text-[var(--color-primary)] hover:underline',
                    overdue && 'text-danger',
                  )}
                >
                  {taskDisplayTitle(task)}
                </Link>
              </TableCell>
              {showPeople ? (
                <>
                  <TableCell className={cn(cellMuted, cellPad, 'whitespace-normal break-words')}>
                    {name(task.createdBy)}
                  </TableCell>
                  {showAssignee || management ? (
                    <TableCell className={cn(cellMuted, cellPad, 'whitespace-normal break-words')}>
                      {task.assigneeIds.map((id) => name(id)).join(', ')}
                    </TableCell>
                  ) : null}
                </>
              ) : null}
              {management ? (
                <TableCell className={cn(cellMuted, cellPad)}>
                  {assigneeDept(task)}
                </TableCell>
              ) : null}
              <TableCell className={cellPad}>
                <Badge
                  variant={priorityVariant[task.priority]}
                  className={cn('capitalize', compact && 'px-1.5 py-0 text-[10px]')}
                >
                  {task.priority}
                </Badge>
              </TableCell>
              <TableCell
                className={cn(
                  cellPad,
                  'whitespace-normal',
                  overdue ? 'font-medium text-danger dark:text-danger' : cellMuted,
                )}
              >
                {task.deadlineAt
                  ? format(task.deadlineAt.toDate(), compact ? 'MMM d, h:mm a' : 'MMM d, HH:mm')
                  : '—'}
                {overdue ? <span className="ml-1 block text-[10px] uppercase tracking-wide">Overdue</span> : null}
              </TableCell>
              <TableCell className={cellPad}>
                <Badge
                  variant="outline"
                  className={cn('capitalize', compact && 'px-1.5 py-0 text-[10px]')}
                >
                  {task.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              {management ? (
                <TableCell className={cn(cellMuted, cellPad, 'whitespace-nowrap')}>
                  {task.updatedAt ? format(task.updatedAt.toDate(), compact ? 'MMM d' : 'MMM d, HH:mm') : '—'}
                </TableCell>
              ) : null}
              {quickCompleteActor ? (
                <TableCell className={cn('w-11 shrink-0 align-middle px-1 py-2')}>
                  <div className="flex items-center justify-center">
                    <TaskQuickCompleteButton
                      task={task}
                      actor={quickCompleteActor}
                      size={compact ? 'sm' : 'md'}
                    />
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
