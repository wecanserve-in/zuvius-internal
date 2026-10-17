import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatUserRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import type { AppUser } from '@/types'

const MIN_SEARCH = 3

function UserAvatar({ user, compact }: { user: AppUser; compact?: boolean }) {
  const src = usePhotoUrl(user)
  const size = compact ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn('shrink-0 rounded-full object-cover', size)}
      />
    )
  }
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] font-semibold text-white',
        size,
      )}
    >
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
  compact = false,
  hideLabel = false,
  minSearchLength = MIN_SEARCH,
  singleLine = false,
}: {
  options: AppUser[]
  value: string[]
  onChange: (ids: string[]) => void
  loading?: boolean
  loadError?: string | null
  onRetry?: () => void
  emptyLabel?: string
  departmentLabelForUser?: (user: AppUser) => string | undefined
  disabled?: boolean
  compact?: boolean
  hideLabel?: boolean
  minSearchLength?: number
  singleLine?: boolean
}) {
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const selectedUsers = useMemo(
    () => value.map((id) => options.find((u) => u.id === id)).filter(Boolean) as AppUser[],
    [value, options],
  )

  const q = query.trim().toLowerCase()
  const searchReady = q.length >= minSearchLength

  const filtered = useMemo(() => {
    const list = options.filter((u) => !value.includes(u.id))
    if (!searchReady) return []
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
  }, [options, q, searchReady, value, departmentLabelForUser])

  const add = (id: string) => {
    if (value.includes(id)) return
    onChange([...value, id])
    setQuery('')
    setDropdownOpen(false)
  }

  const remove = (id: string) => {
    onChange(value.filter((v) => v !== id))
  }

  const showDropdown = dropdownOpen && searchReady && !loading && !loadError

  const chipRow = selectedUsers.length > 0 ? (
    <div className={cn('flex shrink-0 gap-0.5', singleLine ? 'max-w-[40%] overflow-x-auto' : 'flex-wrap gap-1.5')}>
      {selectedUsers.map((u) => (
        <span
          key={u.id}
          className={cn(
            'inline-flex max-w-full items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)]/40 text-xs',
            singleLine ? 'px-1 py-0' : 'gap-1 px-1.5 py-0.5',
          )}
          title={u.displayName}
        >
          {singleLine ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-semibold text-white">
              {u.displayName.charAt(0)}
            </span>
          ) : (
            <>
              <UserAvatar user={u} compact />
              <span className="max-w-[7rem] truncate font-medium">{u.displayName}</span>
            </>
          )}
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
  ) : null

  return (
    <div className={cn(singleLine ? 'min-w-0' : 'space-y-1.5', compact && !singleLine && 'space-y-1')}>
      {!hideLabel && !singleLine ? (
        <Label className={compact ? 'text-xs' : undefined}>Assignees</Label>
      ) : null}
      {!singleLine ? chipRow : null}
      <div className={cn(singleLine && 'flex min-w-0 items-center gap-1')}>
        {singleLine ? chipRow : null}
      <div className={cn('relative', singleLine && 'min-w-0 flex-1')}>
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setDropdownOpen(true)
          }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => window.setTimeout(() => setDropdownOpen(false), 150)}
          placeholder={
            singleLine
              ? `Assignee (${minSearchLength}+)…`
              : `Search assignees (${minSearchLength}+ chars)…`
          }
          disabled={disabled || loading}
          autoComplete="off"
          className={cn('h-9 text-sm', (compact || singleLine) && 'h-8 text-xs')}
        />
        {showDropdown ? (
          <div
            className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-card)] shadow-md"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                {options.length === 0 ? emptyLabel : 'No matches.'}
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
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-[var(--color-muted)]/50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => add(u.id)}
                      >
                        <UserAvatar user={u} compact />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{u.displayName}</span>
                          <span className="text-[var(--color-muted-foreground)]">
                            {' · '}
                            {deptLabel ?? '—'}
                            {' · '}
                            {formatUserRole(u.role)}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
      </div>
      {!singleLine && !searchReady && query.trim().length > 0 ? (
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          Type {minSearchLength - query.trim().length} more character(s) to search.
        </p>
      ) : null}
      {!singleLine && loading ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">Loading members…</p>
      ) : null}
      {!singleLine && loadError ? (
        <div className="space-y-1">
          <p className="text-xs text-danger" role="alert">{loadError}</p>
          {onRetry ? (
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
