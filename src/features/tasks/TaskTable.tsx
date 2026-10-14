import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { isTaskOverdue } from '@/services/tasks.service'
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
}: {
  tasks: Task[]
  usersById?: Map<string, AppUser>
  deptById?: Map<string, Department>
  management?: boolean
  compact?: boolean
}) {
  const name = (id: string) => usersById?.get(id)?.displayName ?? '—'
  const assigneeDept = (task: Task) => {
    const primary = task.assigneeIds[0]
    const user = primary ? usersById?.get(primary) : undefined
    const deptId = user?.departmentIds[0] ?? task.departmentId
    if (!deptId) return '—'
    return deptById?.get(deptId)?.name ?? deptId
  }

  if (tasks.length === 0) {
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
    <div className="overflow-x-auto">
      <Table className={compact ? 'text-xs' : undefined}>
        <TableHeader>
          <TableRow className={compact ? 'hover:bg-transparent' : undefined}>
            <TableHead className={compact ? 'h-8 px-2' : undefined}>Task</TableHead>
            {management ? (
              <>
                <TableHead className={compact ? 'h-8 px-2' : undefined}>Creator</TableHead>
                <TableHead className={compact ? 'h-8 px-2' : undefined}>Assignee</TableHead>
                <TableHead className={compact ? 'h-8 px-2' : undefined}>Dept</TableHead>
              </>
            ) : (
              <TableHead>Assignee</TableHead>
            )}
            <TableHead className={compact ? 'h-8 px-2' : undefined}>Priority</TableHead>
            <TableHead className={compact ? 'h-8 px-2' : undefined}>Deadline</TableHead>
            <TableHead className={compact ? 'h-8 px-2' : undefined}>Status</TableHead>
            {management ? (
              <TableHead className={compact ? 'h-8 px-2' : undefined}>Updated</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className={compact ? 'max-w-[14rem] px-2 py-1.5' : undefined}>
                <Link
                  to={`/tasks/${task.id}`}
                  className="block truncate font-medium hover:underline"
                  title={task.title}
                >
                  {task.title}
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
              ) : (
                <TableCell className={cn(cellMuted, compact && 'max-w-[8rem] truncate px-2 py-1.5')}>
                  {task.assigneeIds.map((id) => name(id)).join(', ')}
                </TableCell>
              )}
              <TableCell className={compact ? 'px-2 py-1.5' : undefined}>
                <Badge
                  variant={priorityVariant[task.priority]}
                  className={cn('capitalize', compact && 'px-1.5 py-0 text-[10px]')}
                >
                  {task.priority}
                </Badge>
              </TableCell>
              <TableCell className={cn(cellMuted, compact && 'whitespace-nowrap px-2 py-1.5')}>
                {task.deadlineAt ? format(task.deadlineAt.toDate(), compact ? 'MMM d' : 'MMM d, HH:mm') : '—'}
                {isTaskOverdue(task) ? (
                  <span className="ml-1 text-[var(--color-destructive)]">!</span>
                ) : null}
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
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
