import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatUserRole } from '@/lib/permissions'
import type { AppUser } from '@/types'

export function TeamMobileList({
  users,
  deptName,
}: {
  users: AppUser[]
  deptName: (id: string) => string
}) {
  if (users.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)] md:hidden">
        No employees match your search.
      </p>
    )
  }

  return (
    <ul className="divide-y overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] md:hidden">
      {users.map((u) => (
        <li key={u.id}>
          <Link
            to={`/team/${u.id}`}
            className="flex min-h-[4.25rem] items-center gap-3 px-3 py-3 active:bg-[var(--color-muted)]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">
              {u.displayName.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{u.displayName}</p>
              <p className="truncate text-xs text-[var(--color-muted-foreground)]">{u.email}</p>
              <p className="mt-0.5 text-xs capitalize text-[var(--color-muted-foreground)]">
                {formatUserRole(u.role)}
                {u.departmentIds.length ? ` · ${u.departmentIds.map(deptName).join(', ')}` : ''}
              </p>
            </div>
            <span
              className={
                u.isActive
                  ? 'shrink-0 text-[10px] font-medium text-[var(--color-success)]'
                  : 'shrink-0 text-[10px] text-[var(--color-muted-foreground)]'
              }
            >
              {u.isActive ? 'Active' : 'Inactive'}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  )
}
