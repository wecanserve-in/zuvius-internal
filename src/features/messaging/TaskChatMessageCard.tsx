import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AppUser, TaskChatEvent } from '@/types'

function eventTitle(kind: TaskChatEvent['eventKind']): string {
  if (kind === 'created') return 'Task assigned'
  if (kind === 'forwarded') return 'Task forwarded'
  return 'Task update'
}

export function TaskChatMessageCard({
  event,
  usersById,
}: {
  event: TaskChatEvent
  usersById: Map<string, AppUser>
}) {
  const assigner = usersById.get(event.assignedById)
  const assignee = usersById.get(event.assigneeId)
  const previous = event.previousAssigneeId
    ? usersById.get(event.previousAssigneeId)
    : undefined

  return (
    <div className="w-full min-w-[min(100%,280px)] max-w-[300px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-left text-[var(--color-foreground)] shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
          {eventTitle(event.eventKind)}
        </p>
        <Badge variant="outline" className="capitalize text-[10px]">
          {event.priority}
        </Badge>
      </div>
      <p className="font-medium leading-snug">{event.title}</p>
      {event.description ? (
        <p className="mt-1 line-clamp-3 text-xs text-[var(--color-muted-foreground)]">
          {event.description}
        </p>
      ) : null}
      <dl className="mt-2 space-y-1 text-xs text-[var(--color-muted-foreground)]">
        <div className="flex justify-between gap-2">
          <dt>Assigned by</dt>
          <dd className="text-right font-medium text-[var(--color-foreground)]">
            {assigner?.displayName ?? '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Assigned to</dt>
          <dd className="text-right font-medium text-[var(--color-foreground)]">
            {assignee?.displayName ?? '—'}
          </dd>
        </div>
        {previous ? (
          <div className="flex justify-between gap-2">
            <dt>Previous assignee</dt>
            <dd className="text-right font-medium text-[var(--color-foreground)]">
              {previous.displayName}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-2">
          <dt>Status</dt>
          <dd className="capitalize">{event.status.replace('_', ' ')}</dd>
        </div>
        {event.deadlineMs ? (
          <div className="flex justify-between gap-2">
            <dt>Due</dt>
            <dd>{format(event.deadlineMs, 'PP')}</dd>
          </div>
        ) : null}
      </dl>
      {event.handoverNote ? (
        <p className="mt-2 rounded-md bg-[var(--color-muted)]/60 p-2 text-xs whitespace-pre-wrap">
          {event.handoverNote}
        </p>
      ) : null}
      <Button asChild size="sm" className="mt-3 w-full" variant="secondary">
        <Link to={`/tasks/${event.taskId}`}>View task</Link>
      </Button>
    </div>
  )
}
