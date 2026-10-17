import type { ComponentType } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Building2,
  CheckSquare,
  ChevronLeft,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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

export function Sidebar({
  user,
  open,
  onToggle,
}: {
  user: AppUser
  open: boolean
  onToggle: () => void
}) {
  const items = visibleNavItems(user)

  return (
    <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-sm transition-[width] duration-200 ease-out md:flex',
          open ? 'w-52' : 'w-0 overflow-hidden border-r-0',
        )}
        aria-hidden={!open}
      >
        <div className="flex h-14 w-52 shrink-0 items-center gap-1 border-b border-[var(--color-border)] px-2 pl-3">
          <img
            src="/zuvius-logo.png"
            alt="Zuvius Lifesciences"
            className="h-9 min-w-0 flex-1 object-contain object-left"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-[var(--color-muted-foreground)]"
            onClick={onToggle}
            aria-label="Close sidebar"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        <nav className="w-52 flex-1 space-y-1 p-3">
          {items.map((item) => {
            const Icon = iconMap[item.label] ?? LayoutDashboard
            const path = item.path === '/' ? '/' : item.path
            return (
              <NavLink
                key={item.path}
                to={path}
                end={item.path === '/'}
                title={item.label}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-fg)] shadow-sm'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-nav-hover-bg)] hover:text-[var(--color-foreground)]',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
    </aside>
  )
}
