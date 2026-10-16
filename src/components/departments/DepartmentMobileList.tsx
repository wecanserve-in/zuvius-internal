import { MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { AppUser, Department } from '@/types'

export function DepartmentMobileList({
  departments,
  users,
  membersByDepartment,
  openTasksByDepartment,
  openingChatDeptId,
  onOpenChat,
  resolveAdmins,
}: {
  departments: Department[]
  users: AppUser[]
  membersByDepartment: Map<string, number>
  openTasksByDepartment: Map<string, number>
  openingChatDeptId: string | null
  onOpenChat: (dept: Department) => void
  resolveAdmins: (dept: Department, roster: AppUser[]) => AppUser[]
}) {
  if (departments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)] md:hidden">
        No departments found.
      </p>
    )
  }

  return (
    <ul className="space-y-2 md:hidden">
      {departments.map((d) => {
        const admins = resolveAdmins(d, users)
        return (
          <li
            key={d.id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-sm"
          >
            <p className="font-medium">{d.name}</p>
            {d.description ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
                {d.description}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
              <span>{membersByDepartment.get(d.id) ?? 0} members</span>
              <span>{openTasksByDepartment.get(d.id) ?? 0} open tasks</span>
            </div>
            {admins.length > 0 ? (
              <p className="mt-2 text-xs">
                <span className="text-[var(--color-muted-foreground)]">Admin: </span>
                {admins.map((u, i) => (
                  <span key={u.id}>
                    {i > 0 ? ', ' : ''}
                    <Link to={`/team/${u.id}`} className="font-medium text-[var(--color-primary)]">
                      {u.displayName}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 min-h-10 w-full gap-2"
              disabled={openingChatDeptId === d.id}
              onClick={() => onOpenChat(d)}
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              {openingChatDeptId === d.id ? 'Opening…' : 'Open department chat'}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
