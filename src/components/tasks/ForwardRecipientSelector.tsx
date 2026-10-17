import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatUserRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { AppUser, Department } from '@/types'

export function ForwardRecipientSelector({
  options,
  value,
  onChange,
  loading,
  loadError,
  onRetry,
  deptById,
  disabled,
}: {
  options: AppUser[]
  value: string
  onChange: (userId: string) => void
  loading?: boolean
  loadError?: string | null
  onRetry?: () => void
  deptById: Map<string, Department>
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')

  const deptLabel = (u: AppUser) => {
    if (!u.departmentIds.length) return 'No department'
    return u.departmentIds
      .map((id) => deptById.get(id)?.name ?? id)
      .join(', ')
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((u) => {
      const dept = deptLabel(u).toLowerCase()
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        dept.includes(q) ||
        formatUserRole(u.role).toLowerCase().includes(q)
      )
    })
  }, [options, query, deptById])

  const selected = value ? options.find((u) => u.id === value) : undefined

  return (
    <div className="space-y-2">
      <Label htmlFor="forward-search">Forward to</Label>
      {selected ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2 text-sm">
          <p className="font-medium">{selected.displayName}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {deptLabel(selected)} · {formatUserRole(selected.role)}
          </p>
          <Button
            type="button"
            variant="ghost"
            className="h-auto p-0 text-xs"
            onClick={() => onChange('')}
            disabled={disabled}
          >
            Change recipient
          </Button>
        </div>
      ) : (
        <>
          <Input
            id="forward-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, department, or role…"
            disabled={disabled || loading}
            autoComplete="off"
          />
          <div className="max-h-48 overflow-auto rounded-md border border-[var(--color-border)]">
            {loading ? (
              <p className="px-3 py-4 text-sm text-[var(--color-muted-foreground)]">
                Loading organisation directory…
              </p>
            ) : loadError ? (
              <div className="space-y-2 px-3 py-4">
                <p className="text-sm text-danger" role="alert">{loadError}</p>
                {onRetry ? (
                  <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                    Retry
                  </Button>
                ) : null}
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-[var(--color-muted-foreground)]">
                {options.length === 0
                  ? 'No eligible teammates found. Ask an admin to verify employee profiles are active.'
                  : 'No matches. Try another search.'}
              </p>
            ) : (
              <ul>
                {filtered.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      className={cn(
                        'flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]/50',
                        value === u.id && 'bg-[var(--color-muted)]/40',
                      )}
                      onClick={() => onChange(u.id)}
                    >
                      <span className="font-medium">{u.displayName}</span>
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {deptLabel(u)} · {formatUserRole(u.role)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
