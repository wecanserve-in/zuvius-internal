import { Bell } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { NotificationRow } from '@/features/notifications/NotificationRow'
import { useAuth } from '@/features/auth/AuthContext'
import {
  filterNotifications,
  groupNotificationsByDate,
  type NotificationFilter,
} from '@/lib/notifications/inbox'
import { cn } from '@/lib/utils'
import {
  markAllNotificationsRead,
  subscribeNotifications,
  unreadCount,
} from '@/services/notifications.service'
import type { AppNotification } from '@/types'

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'messages', label: 'Messages' },
  { id: 'other', label: 'Other' },
]

export function NotificationsPage() {
  const { profile } = useAuth()
  const [items, setItems] = useState<AppNotification[] | null>(null)
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [error, setError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!profile) return
    setError(null)
    return subscribeNotifications(
      profile.id,
      (data) => {
        setItems(data)
        setError(null)
      },
      (err) => {
        setItems([])
        setError(err.message || 'Could not load notifications.')
      },
    )
  }, [profile?.id, retryKey])

  const unread = useMemo(() => (items ? unreadCount(items) : 0), [items])
  const filtered = useMemo(
    () => (items ? filterNotifications(items, filter) : []),
    [items, filter],
  )
  const sections = useMemo(() => groupNotificationsByDate(filtered), [filtered])

  const hasMessageNotifications = useMemo(
    () => items?.some((n) => filterNotifications([n], 'messages').length) ?? false,
    [items],
  )

  const visibleFilters = FILTERS.filter((f) => {
    if (f.id === 'messages' && items && !hasMessageNotifications) return false
    if (f.id === 'other' && items) {
      const otherCount = filterNotifications(items, 'other').length
      if (otherCount === 0) return false
    }
    return true
  })

  const handleMarkAllRead = async () => {
    if (!items || unread === 0) return
    setMarkingAll(true)
    setError(null)
    try {
      await markAllNotificationsRead(items)
    } catch {
      setError('Could not mark all as read. Try again.')
    } finally {
      setMarkingAll(false)
    }
  }

  const loading = items === null && !error

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-3">
      <PageHeader
        compact
        title="Notifications"
        description="Stay updated on tasks, messages, and activity."
        action={
          unread > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              disabled={markingAll}
              onClick={() => void handleMarkAllRead()}
            >
              {markingAll ? 'Updating…' : 'Mark all read'}
            </Button>
          ) : (
            <span className="text-xs text-[var(--color-muted-foreground)] tabular-nums">
              {unread === 0 && items ? 'All caught up' : ''}
            </span>
          )
        }
      />

      {items !== null ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          <span className="font-medium text-[var(--color-foreground)]">{unread}</span>
          {' '}
          unread
          {items.length > 0 ? ` · ${items.length} total` : ''}
        </p>
      ) : null}

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex min-w-max gap-0.5 border-b border-[var(--color-border)]">
          {visibleFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                '-mb-px shrink-0 border-b-2 px-2.5 py-1.5 text-xs font-medium transition-colors',
                filter === f.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              )}
            >
              {f.label}
              {f.id === 'unread' && unread > 0 ? ` (${unread})` : ''}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <p>{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 h-8"
            onClick={() => {
              setItems(null)
              setError(null)
              setRetryKey((k) => k + 1)
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2 py-2" aria-busy="true" aria-label="Loading notifications">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-3 border-b border-[var(--color-border)] px-3 py-3"
            >
              <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-muted)]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/5 animate-pulse rounded bg-[var(--color-muted)]" />
                <div className="h-3 w-full animate-pulse rounded bg-[var(--color-muted)]" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && items?.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="When tasks are assigned, forwarded, or completed, updates will appear here."
        />
      ) : null}

      {!loading && !error && items && items.length > 0 && filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm">
          <p className="font-medium">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications match this filter'}
          </p>
          <p className="mt-1 text-[var(--color-muted-foreground)]">
            {filter === 'unread'
              ? "You're all caught up."
              : 'Try another category or view all notifications.'}
          </p>
          {filter !== 'all' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 h-8"
              onClick={() => setFilter('all')}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
          {sections.map((section) => (
            <section key={section.group}>
              <h2 className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {section.label}
              </h2>
              {section.items.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onError={(msg) => setError(msg)}
                />
              ))}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  )
}
