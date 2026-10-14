import type { ComponentType } from 'react'
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

export function Sidebar({ user }: { user: AppUser }) {
  const items = visibleNavItems(user)
  return (
    <aside className="hidden w-52 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-card)] md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-[var(--color-border)] px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-sm font-bold text-white">
          Z
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Zuvius</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">Internal</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const Icon = iconMap[item.label] ?? LayoutDashboard
          const path = item.path === '/' ? '/' : item.path
          return (
            <NavLink
              key={item.path}
              to={path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-secondary)] text-[var(--color-primary)]'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
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
  )
}
