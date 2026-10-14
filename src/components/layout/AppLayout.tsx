import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { ChatTitleProvider, useChatTitle } from '@/features/messaging/ChatTitleContext'

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

function AppLayoutFrame() {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const { chatTitle } = useChatTitle()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  if (!profile) return null

  const inMessages = pathname.startsWith('/messages')
  const inChat =
    pathname.startsWith('/messages/') && pathname.length > '/messages/'.length
  const headerTitle = inChat && chatTitle ? chatTitle : resolveTitle(pathname)

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar user={profile} />
      <MobileNav user={profile} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={headerTitle}
          backTo={inChat ? '/messages' : undefined}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <main
          className={cn(
            'flex-1 overflow-auto',
            inMessages ? 'overflow-hidden p-0' : 'p-4 md:p-6',
          )}
        >
          <Outlet />
        </main>
      </div>
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
