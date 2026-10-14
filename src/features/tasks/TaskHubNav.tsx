import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type TaskHubTab =
  | 'overview'
  | 'mine'
  | 'created'
  | 'forwarded'
  | 'completed'
  | 'overdue'
  | 'today'
  | 'all'

const PRIMARY_TABS: { id: TaskHubTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'mine', label: 'My tasks' },
]

const MORE_TABS: { id: TaskHubTab; label: string }[] = [
  { id: 'created', label: 'Created by me' },
  { id: 'forwarded', label: 'Forwarded' },
  { id: 'completed', label: 'Completed' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Due today' },
]

export function TaskHubNav({
  value,
  onChange,
  showOrganisation,
}: {
  value: TaskHubTab
  onChange: (tab: TaskHubTab) => void
  showOrganisation: boolean
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const moreItems = showOrganisation
    ? [...MORE_TABS, { id: 'all' as TaskHubTab, label: 'Organisation' }]
    : MORE_TABS

  const moreActive = moreItems.some((t) => t.id === value)
  const moreLabel = moreActive ? moreItems.find((t) => t.id === value)?.label ?? 'More' : 'More'

  useEffect(() => {
    if (!moreOpen) return
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [moreOpen])

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border)]">
      {PRIMARY_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            '-mb-px border-b-2 px-2.5 py-1.5 text-xs font-medium transition-colors',
            value === tab.id
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
          )}
        >
          {tab.label}
        </button>
      ))}

      <div className="relative" ref={moreRef}>
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          onClick={() => setMoreOpen((o) => !o)}
          className={cn(
            '-mb-px flex items-center gap-0.5 border-b-2 px-2.5 py-1.5 text-xs font-medium transition-colors',
            moreActive
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
          )}
        >
          {moreLabel}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {moreOpen ? (
          <div
            role="menu"
            className="absolute left-0 z-20 mt-1 min-w-[11rem] rounded-md border border-[var(--color-border)] bg-[var(--color-card)] py-1 shadow-md"
          >
            {moreItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(tab.id)
                  setMoreOpen(false)
                }}
                className={cn(
                  'block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--color-muted)]/50',
                  value === tab.id && 'font-medium text-[var(--color-primary)]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
