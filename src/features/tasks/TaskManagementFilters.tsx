import { Filter, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppUser, Department, Task, TaskPriority, TaskStatus } from '@/types'

export interface TaskListFilters {
  departmentId: string
  status: string
  priority: string
  creatorId: string
  assigneeId: string
  query: string
}

export const emptyTaskFilters: TaskListFilters = {
  departmentId: '',
  status: '',
  priority: '',
  creatorId: '',
  assigneeId: '',
  query: '',
}

const statuses: TaskStatus[] = ['todo', 'in_progress', 'completed', 'needs_revision', 'cancelled']
const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

const selectClass =
  'h-8 max-w-[10rem] rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-2 text-xs'

export function filtersAreActive(filters: TaskListFilters): boolean {
  return Boolean(
    filters.departmentId ||
      filters.status ||
      filters.priority ||
      filters.creatorId ||
      filters.assigneeId ||
      filters.query.trim(),
  )
}

export function TaskManagementFilters({
  filters,
  onChange,
  departments,
  users,
}: {
  filters: TaskListFilters
  onChange: (next: TaskListFilters) => void
  departments: Department[]
  users: AppUser[]
}) {
  const [showMore, setShowMore] = useState(false)
  const set = (patch: Partial<TaskListFilters>) => onChange({ ...filters, ...patch })
  const active = filtersAreActive(filters)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="task-search"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="Search tasks…"
          className="h-8 w-full min-w-[10rem] max-w-xs text-sm"
          aria-label="Search tasks"
        />
        <select
          id="filter-dept"
          className={selectClass}
          value={filters.departmentId}
          onChange={(e) => set({ departmentId: e.target.value })}
          aria-label="Department"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          id="filter-status"
          className={selectClass}
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          id="filter-priority"
          className={selectClass}
          value={filters.priority}
          onChange={(e) => set({ priority: e.target.value })}
          aria-label="Priority"
        >
          <option value="">All priorities</option>
          {priorities.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-xs"
          onClick={() => setShowMore((v) => !v)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
        </Button>
        {active ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-[var(--color-muted-foreground)]"
            onClick={() => onChange(emptyTaskFilters)}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        ) : null}
      </div>

      {showMore ? (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="filter-creator" className="text-xs">Creator</Label>
            <select
              id="filter-creator"
              className={selectClass}
              value={filters.creatorId}
              onChange={(e) => set({ creatorId: e.target.value })}
            >
              <option value="">All</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.displayName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-assignee" className="text-xs">Current assignee</Label>
            <select
              id="filter-assignee"
              className={selectClass}
              value={filters.assigneeId}
              onChange={(e) => set({ assigneeId: e.target.value })}
            >
              <option value="">All</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.displayName}</option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function applyTaskListFilters(tasks: Task[], filters: TaskListFilters): Task[] {
  const q = filters.query.trim().toLowerCase()
  return tasks.filter((t) => {
    if (filters.departmentId && t.departmentId !== filters.departmentId) return false
    if (filters.status && t.status !== filters.status) return false
    if (filters.priority && t.priority !== filters.priority) return false
    if (filters.creatorId && t.createdBy !== filters.creatorId) return false
    if (filters.assigneeId && !t.assigneeIds.includes(filters.assigneeId)) return false
    if (q) {
      const hay = `${t.title} ${t.description}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}
