import { format } from 'date-fns'
import type { AppUser, TaskHistoryEvent } from '@/types'

function describeEvent(event: TaskHistoryEvent, usersById: Map<string, AppUser>): string {
  const actor = usersById.get(event.actorId)?.displayName ?? 'Someone'
  const next = event.newAssigneeId
    ? usersById.get(event.newAssigneeId)?.displayName ?? 'assignee'
    : 'assignee'
  const prev = event.previousAssigneeId
    ? usersById.get(event.previousAssigneeId)?.displayName ?? 'previous assignee'
    : null

  if (event.kind === 'created') return `Task created by ${actor}`
  if (event.kind === 'forwarded') {
    return `Forwarded by ${actor} from ${prev ?? 'previous assignee'} to ${next}`
  }
  if (event.kind === 'completed') return `Marked complete by ${actor}`
  return `Assigned to ${next}`
}

export function TaskHistoryTimeline({
  events,
  usersById,
}: {
  events: TaskHistoryEvent[]
  usersById: Map<string, AppUser>
}) {
  if (events.length === 0) return null

  return (
    <div className="space-y-3">
      <ol className="space-y-3 border-l border-[var(--color-border)] pl-4">
        {events.map((event) => (
          <li key={event.id} className="relative text-sm">
            <span
              className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-[var(--color-primary)]"
              aria-hidden
            />
            <p className="font-medium">{describeEvent(event, usersById)}</p>
            {event.handoverNote ? (
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)] whitespace-pre-wrap">
                {event.handoverNote}
              </p>
            ) : null}
            {event.createdAt ? (
              <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                {format(event.createdAt.toDate(), 'PPp')}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
