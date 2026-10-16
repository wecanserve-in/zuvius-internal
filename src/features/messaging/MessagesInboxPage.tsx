import { formatDistanceToNow } from 'date-fns'
import { MessageSquare } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { InboxFilterTabs, type InboxFilter } from '@/features/messaging/InboxFilterTabs'
import { NewConversationPanel } from '@/features/messaging/NewConversationPanel'
import { useMessagingInbox } from '@/features/messaging/useMessagingInbox'
import { useAuth } from '@/features/auth/AuthContext'
import { hasMinRole } from '@/lib/permissions'
import { conversationLabel } from '@/services/conversations.service'
import type { Conversation } from '@/types'

function ConversationRow({
  convo,
  label,
  unread,
}: {
  convo: Conversation
  label: string
  unread: boolean
}) {
  return (
    <Link
      to={`/messages/${convo.id}`}
      className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-3 transition-colors hover:bg-[var(--color-muted)]/50"
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
        <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
          {formatDistanceToNow(convo.lastMessageAt.toDate(), { addSuffix: true })}
        </span>
      ) : null}
    </Link>
  )
}

export function MessagesInboxPage() {
  const { profile } = useAuth()
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState<InboxFilter>('personal')
  const { conversations, grouped, usersById, departments, people, unreadById } = useMessagingInbox(profile)

  const list = useMemo(() => {
    return filter === 'personal' ? grouped.direct : grouped.dept
  }, [filter, grouped])

  if (!profile) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Messages</h2>
          {hasMinRole(profile, 'admin') ? (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              You can open any conversation for oversight. You can only send messages in chats you belong to.
            </p>
          ) : null}
        </div>
        <Button type="button" onClick={() => setShowNew((v) => !v)}>
          {showNew ? 'Cancel' : 'New message'}
        </Button>
      </div>

      <InboxFilterTabs
        value={filter}
        onChange={setFilter}
        departmentCount={grouped.dept.length}
      />

      {showNew ? (
        <NewConversationPanel users={people} departments={departments} onClose={() => setShowNew(false)} />
      ) : null}

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No chats yet"
          description="Use New message or switch to Department when channels are ready."
        />
      ) : list.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">Nothing in this tab yet.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-[var(--color-border)]">
          {list.map((c) => (
            <ConversationRow
              key={c.id}
              convo={c}
              label={conversationLabel(c, profile.id, usersById)}
              unread={unreadById[c.id] ?? false}
            />
          ))}
        </div>
      )}
    </div>
  )
}
