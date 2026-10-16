import { useState } from 'react'
import { Bell, CheckSquare, LayoutDashboard, MessageSquare, Plus } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { CreateWorkSheet } from '@/components/common/CreateWorkSheet'
import { useAuth } from '@/features/auth/AuthContext'
import { canCreateTasks } from '@/lib/permissions'
import { shouldShowMobileFab } from '@/lib/layout/mobileChrome'
import { cn } from '@/lib/utils'

const primaryLeft = [
  { path: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare, end: false },
] as const

const primaryRight = [{ path: '/messages', label: 'Messages', icon: MessageSquare, end: false }] as const

function TabLink({
  path,
  label,
  icon: Icon,
  end,
}: {
  path: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}) {
  return (
    <NavLink
      to={path}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium leading-none',
          isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-5 w-5 shrink-0', isActive && 'stroke-[2.25]')} aria-hidden />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function MobileBottomNav({ notificationUnread = 0 }: { notificationUnread?: number }) {
  const { pathname } = useLocation()
  const { profile } = useAuth()
  const [createOpen, setCreateOpen] = useState(false)
  const showFab = Boolean(profile && canCreateTasks(profile) && shouldShowMobileFab(pathname))

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Primary"
      >
        <div className="relative mx-auto flex h-14 max-w-lg items-stretch justify-between px-1">
          <div className="flex min-w-0 flex-[2] items-stretch justify-around">
            {primaryLeft.map((item) => (
              <TabLink key={item.path} {...item} />
            ))}
          </div>

          {showFab ? (
            <div className="relative flex w-[4.25rem] shrink-0 items-end justify-center">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg ring-4 ring-[var(--color-card)] transition-transform active:scale-95"
                aria-label="Create project or task"
              >
                <Plus className="h-7 w-7" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          ) : (
            <div className="w-2 shrink-0" aria-hidden />
          )}

          <div className="flex min-w-0 flex-[2] items-stretch justify-around">
            {primaryRight.map((item) => (
              <TabLink key={item.path} {...item} />
            ))}
            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                cn(
                  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium leading-none',
                  isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-muted-foreground)]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Bell className={cn('h-5 w-5 shrink-0', isActive && 'stroke-[2.25]')} aria-hidden />
                  <span className="truncate">Notifs</span>
                  {notificationUnread > 0 ? (
                    <span className="absolute right-1 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-destructive)] px-1 text-[9px] font-semibold text-white">
                      {notificationUnread > 9 ? '9+' : notificationUnread}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          </div>
        </div>
      </nav>
      <CreateWorkSheet open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
