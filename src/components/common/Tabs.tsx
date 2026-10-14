import { cn } from '@/lib/utils'

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  compact,
}: {
  tabs: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  compact?: boolean
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="flex min-w-max gap-0.5 border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px shrink-0 border-b-2 font-medium transition-colors',
              compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
              value === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
