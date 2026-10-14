import type { ComponentType } from 'react'
import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Building2,
  CheckSquare,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { visibleNavItems } from '@/lib/permissions'
import type { AppUser } from '@/types'

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  Dashboard: LayoutDashboard,
  Messages: MessageSquare,
  Tasks: CheckSquare,
  Departments: Building2,
  Team: Users,
  Activity: Activity,
  Reports: BarChart3,
  Settings: Settings,
}

export function MobileNav({
  user,
  open,
  onClose,
}: {
  user: AppUser
  open: boolean
  onClose: () => void
}) {
  const items = visibleNavItems(user)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-64 max-w-[85vw] flex-col bg-[var(--color-card)] shadow-lg">
        <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-xs font-bold text-white">
              Z
            </div>
            <span className="text-sm font-semibold">Zuvius Internal</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-2 hover:bg-[var(--color-muted)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const Icon = iconMap[item.label] ?? LayoutDashboard
            const path = item.path === '/' ? '/' : item.path
            return (
              <NavLink
                key={item.path}
                to={path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium',
                    isActive
                      ? 'bg-[var(--color-secondary)] text-[var(--color-primary)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </div>
  )
}
