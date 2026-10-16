import { cn } from '@/lib/utils'

export type InboxFilter = 'personal' | 'department'

export function InboxFilterTabs({
  value,
  onChange,
  departmentCount,
}: {
  value: InboxFilter
  onChange: (filter: InboxFilter) => void
  departmentCount: number
}) {
  const tabs: { id: InboxFilter; label: string; count?: number }[] = [
    { id: 'personal', label: 'Personal' },
    { id: 'department', label: 'Department', count: departmentCount },
  ]

  return (
    <div className="flex gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium transition-colors',
            value === tab.id
              ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
              : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
          )}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 ? (
            <span className="text-[10px] tabular-nums text-[var(--color-muted-foreground)]">({tab.count})</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
