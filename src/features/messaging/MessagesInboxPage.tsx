import { formatDistanceToNow } from 'date-fns'
import { MessageSquare } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { NewConversationPanel } from '@/features/messaging/NewConversationPanel'
import { useAuth } from '@/features/auth/AuthContext'
import { hasMinRole } from '@/lib/permissions'
import { listDepartments } from '@/services/departments.service'
import {
  conversationLabel,
  ensureDepartmentChannels,
  getMyLastReadMs,
  subscribeInbox,
} from '@/services/conversations.service'
import { listUsersForMessaging, loadUsersByIds } from '@/services/users.service'
import type { AppUser, Conversation, Department } from '@/types'

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

function Section({
  title,
  items,
  profile,
  usersById,
  unreadById,
}: {
  title: string
  items: Conversation[]
  profile: AppUser
  usersById: Map<string, AppUser>
  unreadById: Record<string, boolean>
}) {
  if (items.length === 0) return null
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-[var(--color-muted-foreground)]">{title}</h3>
      {items.map((c) => (
        <ConversationRow
          key={c.id}
          convo={c}
          label={conversationLabel(c, profile.id, usersById)}
          unread={unreadById[c.id] ?? false}
        />
      ))}
    </section>
  )
}

export function MessagesInboxPage() {
  const { profile } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())
  const [departments, setDepartments] = useState<Department[]>([])
  const [showNew, setShowNew] = useState(false)
  const [unreadById, setUnreadById] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!profile) return
    void listUsersForMessaging().then(setUsers)
    void listDepartments().then(setDepartments)
    return subscribeInbox(profile, setConversations)
  }, [profile])

  useEffect(() => {
    const base = new Map(users.map((u) => [u.id, u]))
    const ids = conversations.flatMap((c) => c.memberIds)
    void loadUsersByIds(ids, base).then(setUsersById)
  }, [users, conversations])

  useEffect(() => {
    if (!profile || departments.length === 0) return
    void ensureDepartmentChannels(profile, departments)
  }, [profile, departments])

  useEffect(() => {
    if (!profile || conversations.length === 0) return
    void (async () => {
      const next: Record<string, boolean> = {}
      for (const c of conversations) {
        if (!c.lastMessageAt) continue
        const readMs = await getMyLastReadMs(c.id, profile.id)
        next[c.id] = c.lastMessageAt.toMillis() > readMs
      }
      setUnreadById(next)
    })()
  }, [profile, conversations])

  const grouped = useMemo(() => {
    const dept: Conversation[] = []
    const direct: Conversation[] = []
    const custom: Conversation[] = []
    for (const c of conversations) {
      if (c.isDepartmentChannel) dept.push(c)
      else if (c.type === 'direct') direct.push(c)
      else custom.push(c)
    }
    return { dept, direct, custom }
  }, [conversations])

  if (!profile) return null

  const people =
    users.length > 0 ? users : [...usersById.values()].filter((u) => u.isActive)

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

      {showNew ? (
        <NewConversationPanel users={people} departments={departments} onClose={() => setShowNew(false)} />
      ) : null}

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No chats yet"
          description="Department groups appear automatically. Use New message for a colleague or a custom group."
        />
      ) : (
        <div className="space-y-6">
          <Section
            title="Department groups"
            items={grouped.dept}
            profile={profile}
            usersById={usersById}
            unreadById={unreadById}
          />
          <Section
            title="Personal"
            items={grouped.direct}
            profile={profile}
            usersById={usersById}
            unreadById={unreadById}
          />
          <Section
            title="Custom groups"
            items={grouped.custom}
            profile={profile}
            usersById={usersById}
            unreadById={unreadById}
          />
        </div>
      )}
    </div>
  )
}
