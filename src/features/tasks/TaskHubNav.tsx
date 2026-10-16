import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TaskHubScope = 'org' | 'yours'

export type TaskHubTab =
  | 'overview'
  | 'mine'
  | 'created'
  | 'forwarded'
  | 'completed'
  | 'overdue'
  | 'today'

export const PERSONAL_WORK_TABS: { id: TaskHubTab; label: string }[] = [
  { id: 'mine', label: 'My tasks' },
  { id: 'created', label: 'Created by me' },
  { id: 'forwarded', label: 'Forwarded' },
  { id: 'completed', label: 'Completed' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Due today' },
]

export function TaskHubScopeSwitcher({
  scope,
  onOrganisation,
  onYourWork,
  showOrganisation,
  organisationLabel = 'Organisation',
}: {
  scope: TaskHubScope | null
  onOrganisation: () => void
  onYourWork: () => void
  showOrganisation: boolean
  organisationLabel?: string
}) {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      {showOrganisation ? (
        <ScopeButton active={scope === 'org'} onClick={onOrganisation} className="flex-1 sm:flex-none">
          {organisationLabel}
        </ScopeButton>
      ) : null}
      <ScopeButton active={scope === 'yours'} onClick={onYourWork} className="flex-1 sm:flex-none">
        Your work
      </ScopeButton>
    </div>
  )
}

function ScopeButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-4 py-2.5 text-sm font-medium transition-colors sm:py-2',
        className,
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm'
          : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/40',
      )}
    >
      {children}
    </button>
  )
}

export function PersonalWorkSubNav({
  value,
  onChange,
}: {
  value: TaskHubTab
  onChange: (tab: TaskHubTab) => void
}) {
  return (
    <div className="-mx-1 overflow-x-auto border-b border-[var(--color-border)] px-1 pb-2 [scrollbar-width:thin]">
      <div className="flex min-w-max gap-0.5">
      {PERSONAL_WORK_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            '-mb-px shrink-0 border-b-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors sm:px-2.5 sm:py-1.5',
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

export type OverviewKind = 'projects' | 'tasks'

export function OverviewKindToggle({
  value,
  onChange,
}: {
  value: OverviewKind
  onChange: (kind: OverviewKind) => void
}) {
  return (
    <div className="flex w-full max-w-xs gap-1 rounded-md border border-[var(--color-border)] p-0.5 sm:w-fit sm:max-w-none">
      <button
        type="button"
        onClick={() => onChange('projects')}
        className={cn(
          'rounded px-3 py-1 text-xs font-medium transition-colors',
          value === 'projects'
            ? 'bg-[var(--color-accent)] text-white'
            : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/50',
        )}
      >
        Projects
      </button>
      <button
        type="button"
        onClick={() => onChange('tasks')}
        className={cn(
          'rounded px-3 py-1 text-xs font-medium transition-colors',
          value === 'tasks'
            ? 'bg-[var(--color-primary)] text-white'
            : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/50',
        )}
      >
        Tasks
      </button>
    </div>
  )
}
