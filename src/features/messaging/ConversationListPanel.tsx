import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/EmptyState'
import { InboxFilterTabs, type InboxFilter } from '@/features/messaging/InboxFilterTabs'
import { NewConversationPanel } from '@/features/messaging/NewConversationPanel'
import { useMessagingInboxContext } from '@/features/messaging/MessagingInboxContext'
import { useAuth } from '@/features/auth/AuthContext'
import { hasMinRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { conversationLabel } from '@/services/conversations.service'
import type { Conversation } from '@/types'

function ConversationRow({
  convo,
  label,
  unread,
  active,
}: {
  convo: Conversation
  label: string
  unread: boolean
  active: boolean
}) {
  return (
    <Link
      to={`/messages/${convo.id}`}
      className={cn(
        'flex min-h-[4.25rem] items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-3 transition-colors active:bg-[var(--color-muted)]/40',
        active ? 'bg-[var(--color-nav-active-bg)]' : 'hover:bg-[var(--color-muted)]/50',
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{label}</p>
          {unread ? (
            <Badge variant="default" className="h-5 px-1.5 text-[10px]">New</Badge>
          ) : null}
        </div>
        <p className="line-clamp-1 text-xs text-[var(--color-muted-foreground)]">
          {convo.lastMessage ?? 'Say hello'}
        </p>
      </div>
      {convo.lastMessageAt ? (
        <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
          {formatDistanceToNow(convo.lastMessageAt.toDate(), { addSuffix: true })}
        </span>
      ) : null}
    </Link>
  )
}

function filterForInbox(
  activeId: string | undefined,
  grouped: ReturnType<typeof useMessagingInboxContext>['grouped'],
): InboxFilter | null {
  if (!activeId) return null
  if (grouped.direct.some((c) => c.id === activeId)) return 'personal'
  if (grouped.dept.some((c) => c.id === activeId)) return 'department'
  return null
}

export function ConversationListPanel({ className }: { className?: string }) {
  const { profile } = useAuth()
  const { conversationId: activeId } = useParams<{ conversationId?: string }>()
  const [showNew, setShowNew] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<InboxFilter>('personal')

  const { grouped, usersById, departments, people, unreadById } = useMessagingInboxContext()

  useEffect(() => {
    if (!activeId) return
    const match = filterForInbox(activeId, grouped)
    if (match) setFilter(match)
  }, [activeId, grouped.dept, grouped.direct])

  const sourceList = useMemo(() => {
    return filter === 'personal' ? grouped.direct : grouped.dept
  }, [filter, grouped])

  const filteredChats = useMemo(() => {
    if (!profile) return []
    if (!query.trim()) return sourceList
    const q = query.toLowerCase()
    return sourceList.filter((c) => {
      const label = conversationLabel(c, profile.id, usersById).toLowerCase()
      return label.includes(q) || (c.lastMessage ?? '').toLowerCase().includes(q)
    })
  }, [sourceList, query, profile, usersById])

  const searchPlaceholder = filter === 'personal' ? 'Search people…' : 'Search departments…'

  const emptyCopy =
    filter === 'personal'
      ? {
          title: grouped.direct.length === 0 ? 'No personal chats yet' : 'No matches',
          description:
            grouped.direct.length === 0
              ? 'Use New to message a colleague.'
              : 'Try another name or message.',
        }
      : {
          title: grouped.dept.length === 0 ? 'No department chats' : 'No matches',
          description:
            grouped.dept.length === 0
              ? 'Department channels appear when you belong to a department.'
              : 'Try another search.',
        }

  if (!profile) return null

  return (
    <div className={cn('flex h-full min-h-0 flex-col border-[var(--color-border)] bg-[var(--color-card)]', className)}>
      <div className="shrink-0 space-y-2 border-b border-[var(--color-border)] p-3">
        <InboxFilterTabs
          value={filter}
          onChange={setFilter}
          departmentCount={grouped.dept.length}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-[var(--color-muted-foreground)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 pl-8"
            />
          </div>
          <Button
            type="button"
            className="min-h-11 shrink-0 sm:h-9"
            onClick={() => setShowNew((v) => !v)}
          >
            {showNew ? 'Close' : 'New chat'}
          </Button>
        </div>
        {hasMinRole(profile, 'admin') ? (
          <p className="text-[10px] leading-snug text-[var(--color-muted-foreground)]">
            Admins can open any chat for oversight. Sending requires membership.
          </p>
        ) : null}
        {showNew ? (
          <NewConversationPanel users={people} departments={departments} onClose={() => setShowNew(false)} />
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={MessageSquare} title={emptyCopy.title} description={emptyCopy.description} />
          </div>
        ) : (
          filteredChats.map((c) => (
            <ConversationRow
              key={c.id}
              convo={c}
              label={conversationLabel(c, profile.id, usersById)}
              unread={unreadById[c.id] ?? false}
              active={c.id === activeId}
            />
          ))
        )}
      </div>
    </div>
  )
}
