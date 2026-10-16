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
    if (event.previousAssigneeId && event.previousAssigneeId === event.actorId) {
      return `Forwarded by ${actor} to ${next}`
    }
    return `Forwarded by ${actor} from ${prev ?? 'previous assignee'} to ${next}`
  }
  if (event.kind === 'completed') return `Marked complete by ${actor}`
  return `Assigned to ${next}`
}

export function TaskHistoryTimeline({
  events,
  usersById,
  layout = 'vertical',
}: {
  events: TaskHistoryEvent[]
  usersById: Map<string, AppUser>
  layout?: 'vertical' | 'horizontal'
}) {
  if (events.length === 0) return null

  if (layout === 'horizontal') {
    return (
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-min items-start gap-0" aria-label="Task history">
          {events.map((event, i) => (
            <li key={event.id} className="flex max-w-[11rem] shrink-0 items-start sm:max-w-[14rem]">
              <div className="flex flex-col gap-0.5 px-2">
                <span
                  className="mx-auto h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]"
                  aria-hidden
                />
                <p className="text-xs font-medium leading-snug">{describeEvent(event, usersById)}</p>
                {event.handoverNote ? (
                  <p className="text-[10px] text-[var(--color-muted-foreground)] line-clamp-2 whitespace-pre-wrap">
                    {event.handoverNote}
                  </p>
                ) : null}
                {event.createdAt ? (
                  <p className="text-[10px] text-[var(--color-muted-foreground)]">
                    {format(event.createdAt.toDate(), 'PPp')}
                  </p>
                ) : null}
              </div>
              {i < events.length - 1 ? (
                <span
                  className="mt-1 h-px w-4 shrink-0 self-start bg-[var(--color-border)] sm:w-6"
                  aria-hidden
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    )
  }

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
