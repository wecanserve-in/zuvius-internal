import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { showHeaderBack } from '@/lib/navigation/showHeaderBack'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { ChatTitleProvider, useChatTitle } from '@/features/messaging/ChatTitleContext'
import { BabyCeoCompanion } from '@/components/companion/BabyCeoCompanion'
import { subscribeNotifications, unreadCount } from '@/services/notifications.service'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/messages': 'Messages',
  '/tasks': 'Tasks',
  '/tasks/mine': 'Tasks',
  '/tasks/overdue': 'Overdue Tasks',
  '/tasks/created': 'Tasks I Created',
  '/tasks/pending': 'Pending Tasks',
  '/tasks/completed': 'Completed Tasks',
  '/tasks/today': 'Due Today',
  '/tasks/department': 'Department Tasks',
  '/tasks/new': 'Create Task',
  '/departments': 'Departments',
  '/team': 'Team',
  '/activity': 'Activity',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
}

function resolveTitle(pathname: string) {
  if (pathname.startsWith('/tasks/') && titles[pathname]) {
    return titles[pathname]
  }
  if (pathname.startsWith('/tasks/')) {
    return 'Task Details'
  }
  if (pathname.startsWith('/messages/')) return 'Messages'
  if (pathname.startsWith('/team/')) return 'Employee Profile'
  return titles[pathname] ?? 'Zuvius Internal'
}

const SIDEBAR_STORAGE_KEY = 'zuvius-sidebar-open'

function readSidebarOpen(): boolean {
  try {
    const v = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (v === 'false') return false
    if (v === 'true') return true
  } catch {
    /* ignore */
  }
  return true
}

function AppLayoutFrame() {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const { chatTitle } = useChatTitle()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen)
  const [notificationUnread, setNotificationUnread] = useState(0)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen))
    } catch {
      /* ignore */
    }
  }, [sidebarOpen])

  useEffect(() => {
    if (!profile) return
    return subscribeNotifications(profile.id, (items) => setNotificationUnread(unreadCount(items)))
  }, [profile?.id])

  if (!profile) return null

  const inMessages = pathname.startsWith('/messages')
  const inChat =
    pathname.startsWith('/messages/') && pathname.length > '/messages/'.length
  const inTaskCreate = pathname === '/tasks/new'
  const lockMainScroll = inMessages || inTaskCreate
  const headerTitle = inChat && chatTitle ? chatTitle : resolveTitle(pathname)

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-[var(--color-background)]">
      <Sidebar
        user={profile}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
      />
      <MobileNav user={profile} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <MobileBottomNav notificationUnread={notificationUnread} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header
          title={headerTitle}
          showBack={showHeaderBack(pathname)}
          backFallback={inChat ? '/messages' : '/'}
          onMenuClick={() => setMobileNavOpen(true)}
          sidebarOpen={sidebarOpen}
          onSidebarOpen={() => setSidebarOpen(true)}
        />
        <main
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col',
            lockMainScroll
              ? 'overflow-hidden p-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0'
              : 'overflow-auto p-3 pb-[calc(3.5rem+1rem+env(safe-area-inset-bottom))] sm:p-4 md:p-6 md:pb-6',
          )}
        >
          {lockMainScroll ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <Outlet />
            </div>
          ) : (
            <div className="mx-auto w-full min-w-0 max-w-[96rem] flex-1">
              <Outlet />
            </div>
          )}
        </main>
      </div>
      <BabyCeoCompanion userId={profile.id} />
    </div>
  )
}

export function AppLayout() {
  return (
    <ChatTitleProvider>
      <AppLayoutFrame />
    </ChatTitleProvider>
  )
}
