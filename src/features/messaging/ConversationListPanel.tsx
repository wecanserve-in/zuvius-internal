import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/EmptyState'
import { NewConversationPanel } from '@/features/messaging/NewConversationPanel'
import { useAuth } from '@/features/auth/AuthContext'
import { hasMinRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
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
        'flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2.5 transition-colors',
        active
          ? 'bg-[var(--color-secondary)]'
          : 'hover:bg-[var(--color-muted)]/50',
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

function Section({
  title,
  items,
  profile,
  usersById,
  unreadById,
  activeId,
  query,
}: {
  title: string
  items: Conversation[]
  profile: AppUser
  usersById: Map<string, AppUser>
  unreadById: Record<string, boolean>
  activeId?: string
  query: string
}) {
  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter((c) => {
      const label = conversationLabel(c, profile.id, usersById).toLowerCase()
      return label.includes(q) || (c.lastMessage ?? '').toLowerCase().includes(q)
    })
  }, [items, query, profile.id, usersById])

  if (filtered.length === 0) return null
  return (
    <section>
      <h3 className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {title}
      </h3>
      {filtered.map((c) => (
        <ConversationRow
          key={c.id}
          convo={c}
          label={conversationLabel(c, profile.id, usersById)}
          unread={unreadById[c.id] ?? false}
          active={c.id === activeId}
        />
      ))}
    </section>
  )
}

export function ConversationListPanel({ className }: { className?: string }) {
  const { profile } = useAuth()
  const { conversationId: activeId } = useParams<{ conversationId?: string }>()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())
  const [departments, setDepartments] = useState<Department[]>([])
  const [showNew, setShowNew] = useState(false)
  const [unreadById, setUnreadById] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')

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
    <div className={cn('flex h-full min-h-0 flex-col border-[var(--color-border)] bg-[var(--color-card)]', className)}>
      <div className="shrink-0 space-y-2 border-b border-[var(--color-border)] p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Button type="button" size="sm" onClick={() => setShowNew((v) => !v)}>
            {showNew ? 'Close' : 'New'}
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
        {conversations.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={MessageSquare}
              title="No chats yet"
              description="Department groups appear automatically. Start a personal or custom chat with New."
            />
          </div>
        ) : (
          <>
            <Section
              title="Department groups"
              items={grouped.dept}
              profile={profile}
              usersById={usersById}
              unreadById={unreadById}
              activeId={activeId}
              query={query}
            />
            <Section
              title="Personal"
              items={grouped.direct}
              profile={profile}
              usersById={usersById}
              unreadById={unreadById}
              activeId={activeId}
              query={query}
            />
            <Section
              title="Custom groups"
              items={grouped.custom}
              profile={profile}
              usersById={usersById}
              unreadById={unreadById}
              activeId={activeId}
              query={query}
            />
          </>
        )}
      </div>
    </div>
  )
}
