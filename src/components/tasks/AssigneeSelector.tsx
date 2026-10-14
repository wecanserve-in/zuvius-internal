import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatUserRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { AppUser } from '@/types'

function UserAvatar({ user }: { user: AppUser }) {
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
      {user.displayName.charAt(0)}
    </span>
  )
}

export function AssigneeSelector({
  options,
  value,
  onChange,
  loading,
  loadError,
  onRetry,
  emptyLabel = 'No eligible members in this department.',
  departmentLabelForUser,
  disabled,
}: {
  options: AppUser[]
  value: string[]
  onChange: (ids: string[]) => void
  loading?: boolean
  loadError?: string | null
  onRetry?: () => void
  emptyLabel?: string
  /** When provided, shows which managed department context applies (multi-dept admins). */
  departmentLabelForUser?: (user: AppUser) => string | undefined
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')

  const selectedUsers = useMemo(
    () => value.map((id) => options.find((u) => u.id === id)).filter(Boolean) as AppUser[],
    [value, options],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = options.filter((u) => !value.includes(u.id))
    if (!q) return list
    return list.filter((u) => {
      const dept = departmentLabelForUser?.(u)?.toLowerCase() ?? ''
      const role = formatUserRole(u.role).toLowerCase()
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        dept.includes(q) ||
        role.includes(q)
      )
    })
  }, [options, query, value])

  const add = (id: string) => {
    if (value.includes(id)) return
    onChange([...value, id])
    setQuery('')
  }

  const remove = (id: string) => {
    onChange(value.filter((v) => v !== id))
  }

  return (
    <div className="space-y-2">
      <Label>Assignees</Label>
      {selectedUsers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-2 py-1 text-xs"
            >
              <UserAvatar user={u} />
              <span className="max-w-[8rem] truncate font-medium">{u.displayName}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-[var(--color-muted)]"
                aria-label={`Remove ${u.displayName}`}
                onClick={() => remove(u.id)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name…"
        disabled={disabled || loading}
        autoComplete="off"
      />
      <div className="max-h-44 overflow-auto rounded-md border border-[var(--color-border)]">
        {loading ? (
          <p className="px-3 py-4 text-sm text-[var(--color-muted-foreground)]">Loading members…</p>
        ) : loadError ? (
          <div className="space-y-2 px-3 py-4">
            <p className="text-sm text-red-600" role="alert">{loadError}</p>
            {onRetry ? (
              <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-[var(--color-muted-foreground)]">
            {options.length === 0 ? emptyLabel : 'No matches. Try another search.'}
          </p>
        ) : (
          <ul>
            {filtered.map((u) => {
              const deptLabel = departmentLabelForUser?.(u)
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]/50',
                    )}
                    onClick={() => add(u.id)}
                  >
                    <UserAvatar user={u} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{u.displayName}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {formatUserRole(u.role)}
                        {deptLabel ? ` · ${deptLabel}` : ''}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
