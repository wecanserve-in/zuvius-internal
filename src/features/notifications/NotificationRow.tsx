import { format, formatDistanceToNow } from 'date-fns'
import {
  ArrowRightLeft,
  Bell,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { actorHintFromBody, notificationDestination } from '@/lib/notifications/inbox'
import { notificationAction } from '@/lib/notifications/notificationCta'
import {
  markNotificationRead,
  markNotificationUnread,
} from '@/services/notifications.service'
import type { AppNotification, NotificationType } from '@/types'

function NotificationIcon({ type }: { type: NotificationType }) {
  const className = 'h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]'
  if (type === 'task_forwarded' || type === 'task_reassigned') {
    return <ArrowRightLeft className={className} aria-hidden />
  }
  if (type === 'task_completed') return <CheckCircle2 className={className} aria-hidden />
  if (type === 'message_direct' || type === 'message_group') {
    return <MessageSquare className={className} aria-hidden />
  }
  if (type.startsWith('task_')) return <ClipboardList className={className} aria-hidden />
  return <Bell className={className} aria-hidden />
}

export function NotificationRow({
  notification,
  onError,
}: {
  notification: AppNotification
  onError: (message: string) => void
}) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const unread = !notification.readAt
  const dest = notificationDestination(notification)
  const action = notificationAction(notification)
  const actor = actorHintFromBody(notification.body)
  const created = notification.createdAt?.toDate()
  const relative = created ? formatDistanceToNow(created, { addSuffix: true }) : ''
  const exact = created ? format(created, 'MMM d, yyyy · h:mm a') : ''

  const openDestination = async () => {
    if (!dest) return
    if (unread && !busy) {
      setBusy(true)
      try {
        await markNotificationRead(notification.id)
      } catch {
        onError('Could not mark notification as read.')
        setBusy(false)
        return
      }
      setBusy(false)
    }
    navigate(dest)
  }

  const toggleRead = async (read: boolean) => {
    setMenuOpen(false)
    setBusy(true)
    try {
      if (read) await markNotificationRead(notification.id)
      else await markNotificationUnread(notification.id)
    } catch {
      onError(read ? 'Could not mark as read.' : 'Could not mark as unread.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        'group relative flex gap-3 border-b border-[var(--color-border)] px-3 py-2.5 transition-colors',
        unread ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-muted)]/30',
      )}
    >
      {unread ? (
        <span
          className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--color-primary)]"
          aria-hidden
        />
      ) : null}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)]/50">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          disabled={!dest || busy}
          onClick={() => void openDestination()}
          className="w-full text-left disabled:cursor-default"
        >
          <p className={cn('text-sm leading-snug', unread && 'font-medium')}>{notification.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
            {notification.body}
          </p>
          <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">
            {actor ? <span>{actor} · </span> : null}
            <time dateTime={created?.toISOString()} title={exact}>{relative}</time>
          </p>
        </button>
        {action ? (
          <Button
            type="button"
            size="sm"
            className="mt-2 h-7 text-xs"
            disabled={busy}
            onClick={() => void openDestination()}
          >
            {action.label}
          </Button>
        ) : null}
      </div>
      <div className="relative shrink-0" ref={menuRef}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          aria-label="Notification actions"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        {menuOpen ? (
          <div
            className="absolute right-0 z-10 mt-1 min-w-[10rem] rounded-md border border-[var(--color-border)] bg-[var(--color-card)] py-1 shadow-md"
            role="menu"
          >
            {dest ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--color-muted)]/50"
                onClick={() => {
                  setMenuOpen(false)
                  void openDestination()
                }}
              >
                {action?.label ?? 'Open'}
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--color-muted)]/50"
              onClick={() => void toggleRead(unread)}
            >
              {unread ? 'Mark as read' : 'Mark as unread'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
