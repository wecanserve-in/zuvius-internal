import { ArrowLeft, Bell, ChevronDown, Menu, Moon, PanelLeft, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { formatUserRole } from '@/lib/permissions'
import { subscribeNotifications, unreadCount } from '@/services/notifications.service'

export function Header({
  title,
  backTo,
  onMenuClick,
  sidebarOpen,
  onSidebarOpen,
}: {
  title: string
  backTo?: string
  onMenuClick?: () => void
  sidebarOpen?: boolean
  onSidebarOpen?: () => void
}) {
  const { profile, logout } = useAuth()
  const [unread, setUnread] = useState(0)
  const [dark, setDark] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profile) return
    return subscribeNotifications(profile.id, (items) => setUnread(unreadCount(items)))
  }, [profile])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)]/85 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:gap-3 sm:px-4 md:px-5">
      {onMenuClick ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          aria-label="Open menu"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
      ) : null}
      {onSidebarOpen && sidebarOpen === false ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden shrink-0 md:inline-flex"
          aria-label="Open sidebar"
          onClick={onSidebarOpen}
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      ) : null}
      {backTo ? (
        <Link to={backTo} aria-label="Back">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      ) : null}
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{title}</h1>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Link to="/notifications" className="relative hidden md:inline-flex">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-destructive)] px-1 text-[10px] text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </Link>
        {profile ? (
          <div className="relative ml-1 border-l border-[var(--color-border)] pl-2" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--color-muted)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
                {profile.displayName.charAt(0)}
              </span>
              <span className="hidden max-w-[6rem] truncate font-medium md:inline lg:max-w-[8rem]">
                {profile.displayName}
              </span>
              <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] py-1 shadow-sm">
                <p className="px-3 py-2 text-xs text-[var(--color-muted-foreground)] capitalize">
                  {formatUserRole(profile.role)}
                </p>
                <Link
                  to="/settings"
                  className="block px-3 py-2 text-sm hover:bg-[var(--color-muted)]"
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </Link>
                <Link
                  to={`/team/${profile.id}`}
                  className="block px-3 py-2 text-sm hover:bg-[var(--color-muted)]"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]"
                  onClick={() => void logout()}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}
