import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { Department } from '@/types'

export function DepartmentSelect({
  departments,
  value,
  onChange,
  disabled,
}: {
  departments: Department[]
  value: string
  onChange: (departmentId: string) => void
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selected = departments.find((d) => d.id === value)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return departments
    return departments.filter((d) => d.name.toLowerCase().includes(q))
  }, [departments, query])

  return (
    <div className="space-y-2">
      <Label>Department</Label>
      <div className="relative">
        <Input
          value={open ? query : selected?.name ?? ''}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150)
          }}
          placeholder="Search departments…"
          disabled={disabled}
          autoComplete="off"
        />
        {open && !disabled ? (
          <ul
            className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-card)] py-1 shadow-sm"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                No departments match your search.
              </li>
            ) : (
              filtered.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]',
                      d.id === value && 'bg-[var(--color-secondary)] font-medium',
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(d.id)
                      setQuery('')
                      setOpen(false)
                    }}
                  >
                    {d.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
