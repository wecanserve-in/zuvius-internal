import { format } from 'date-fns'
import type { TaskDisplayContext } from '@/lib/tasks/display'
import type { Task } from '@/types'

export function TaskAssignmentSummary({
  task,
  context,
}: {
  task: Task
  context: TaskDisplayContext
}) {
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-[var(--color-muted-foreground)]">Created by</dt>
        <dd className="font-medium text-[var(--color-foreground)]">{context.creatorLabel}</dd>
        {task.createdAt ? (
          <dd className="text-xs text-[var(--color-muted-foreground)]">
            {format(task.createdAt.toDate(), 'PPp')}
          </dd>
        ) : null}
      </div>
      {context.assignedByLabel ? (
        <div>
          <dt className="text-[var(--color-muted-foreground)]">Assigned by</dt>
          <dd className="font-medium">{context.assignedByLabel}</dd>
        </div>
      ) : null}
      <div>
        <dt className="text-[var(--color-muted-foreground)]">Originally assigned to</dt>
        <dd className="font-medium">{context.originalAssigneeLabel}</dd>
      </div>
      <div>
        <dt className="text-[var(--color-muted-foreground)]">Currently assigned to</dt>
        <dd className="font-medium">{context.currentAssigneeLabel}</dd>
        {context.currentAssigneeDepartmentLabel ? (
          <dd className="text-xs text-[var(--color-muted-foreground)]">
            {context.currentAssigneeDepartmentLabel}
          </dd>
        ) : null}
      </div>
      {context.wasForwarded && context.lastForwardedByLabel ? (
        <div className="sm:col-span-2">
          <dt className="text-[var(--color-muted-foreground)]">Last forwarded by</dt>
          <dd className="font-medium">{context.lastForwardedByLabel}</dd>
          {context.lastHandoverNote ? (
            <dd className="mt-1 whitespace-pre-wrap text-xs text-[var(--color-muted-foreground)]">
              {context.lastHandoverNote}
            </dd>
          ) : null}
        </div>
      ) : null}
    </dl>
  )
}
