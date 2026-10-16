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
}: {
  tasks: Task[]
  usersById?: Map<string, AppUser>
  deptById?: Map<string, Department>
  management?: boolean
  compact?: boolean
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

  const rows = useMemo(() => sortTasksForDisplay(tasks), [tasks])

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

  return (
    <div className="max-w-full min-w-0">
      <TaskMobileList
        tasks={rows}
        usersById={usersById}
        deptById={deptById}
        management={management}
        showAssignee={showAssignee}
      />
      <Table className={cn('hidden md:table', compact ? 'text-xs' : undefined)}>
        <TableHeader>
          <TableRow className={compact ? 'hover:bg-transparent' : undefined}>
            <TableHead className={compact ? 'h-8 px-2' : undefined}>Task</TableHead>
            {management ? (
              <>
                <TableHead className={compact ? 'h-8 px-2' : undefined}>Creator</TableHead>
                <TableHead className={compact ? 'h-8 px-2' : undefined}>Assignee</TableHead>
                <TableHead className={compact ? 'h-8 px-2' : undefined}>Dept</TableHead>
              </>
            ) : showAssignee ? (
              <TableHead>Assignee</TableHead>
            ) : null}
            <TableHead className={compact ? 'h-8 px-2' : undefined}>Priority</TableHead>
            <TableHead className={compact ? 'h-8 px-2' : undefined}>Deadline</TableHead>
            <TableHead className={compact ? 'h-8 px-2' : undefined}>Status</TableHead>
            {management ? (
              <TableHead className={compact ? 'h-8 px-2' : undefined}>Updated</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((task) => {
            const overdue = isTaskOverdue(task)
            return (
            <TableRow key={task.id} className={overdueTaskSurfaceClass(overdue)}>
              <TableCell className={compact ? 'max-w-[14rem] px-2 py-1.5' : undefined}>
                <Link
                  to={`/tasks/${task.id}`}
                  className={cn('block truncate font-medium hover:underline', overdue && 'text-red-900 dark:text-red-100')}
                  title={taskDisplayTitle(task)}
                >
                  {taskDisplayTitle(task)}
                </Link>
              </TableCell>
              {management ? (
                <>
                  <TableCell className={cn(cellMuted, compact && 'max-w-[8rem] truncate px-2 py-1.5')}>
                    <span title={name(task.createdBy)}>{name(task.createdBy)}</span>
                  </TableCell>
                  <TableCell className={cn(cellMuted, compact && 'max-w-[8rem] truncate px-2 py-1.5')}>
                    <span title={task.assigneeIds.map((id) => name(id)).join(', ')}>
                      {task.assigneeIds.map((id) => name(id)).join(', ')}
                    </span>
                  </TableCell>
                  <TableCell className={cn(cellMuted, compact && 'px-2 py-1.5')}>
                    {assigneeDept(task)}
                  </TableCell>
                </>
              ) : showAssignee ? (
                <TableCell className={cn(cellMuted, compact && 'max-w-[8rem] truncate px-2 py-1.5')}>
                  {task.assigneeIds.map((id) => name(id)).join(', ')}
                </TableCell>
              ) : null}
              <TableCell className={compact ? 'px-2 py-1.5' : undefined}>
                <Badge
                  variant={priorityVariant[task.priority]}
                  className={cn('capitalize', compact && 'px-1.5 py-0 text-[10px]')}
                >
                  {task.priority}
                </Badge>
              </TableCell>
              <TableCell
                className={cn(
                  compact && 'whitespace-nowrap px-2 py-1.5',
                  overdue ? 'font-medium text-red-700 dark:text-red-300' : cellMuted,
                )}
              >
                {task.deadlineAt
                  ? format(task.deadlineAt.toDate(), compact ? 'MMM d, h:mm a' : 'MMM d, HH:mm')
                  : '—'}
                {overdue ? <span className="ml-1.5 text-[10px] uppercase tracking-wide">Overdue</span> : null}
              </TableCell>
              <TableCell className={compact ? 'px-2 py-1.5' : undefined}>
                <Badge
                  variant="outline"
                  className={cn('capitalize', compact && 'px-1.5 py-0 text-[10px]')}
                >
                  {task.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              {management ? (
                <TableCell className={cn(cellMuted, compact && 'whitespace-nowrap px-2 py-1.5')}>
                  {task.updatedAt ? format(task.updatedAt.toDate(), compact ? 'MMM d' : 'MMM d, HH:mm') : '—'}
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
