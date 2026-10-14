import { CheckSquare, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/features/auth/AuthContext'
import {
  applyTaskListFilters,
  emptyTaskFilters,
  TaskManagementFilters,
} from '@/features/tasks/TaskManagementFilters'
import { TaskHubNav, type TaskHubTab } from '@/features/tasks/TaskHubNav'
import { TaskTable } from '@/features/tasks/TaskTable'
import { canCreateTasks, canViewAllTasks } from '@/lib/permissions'
import { computeTaskMetrics } from '@/lib/tasks/taskStats'
import { listDepartments } from '@/services/departments.service'
import {
  isTaskDueToday,
  isTaskOverdue,
  isTaskPending,
  subscribeAllTasks,
  subscribeForwardedTasks,
  subscribeMyTasks,
  subscribeTasksCreatedBy,
} from '@/services/tasks.service'
import { listOrgTaskMemberCandidates, loadUsersByIds } from '@/services/users.service'
import type { AppUser, Department, Task } from '@/types'

export function TasksHubPage() {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())
  const [filters, setFilters] = useState(emptyTaskFilters)

  const tab = (searchParams.get('tab') as TaskHubTab) || 'overview'

  useEffect(() => {
    if (!profile) return
    if (tab === 'all' && canViewAllTasks(profile)) return subscribeAllTasks(setTasks)
    if (tab === 'created') return subscribeTasksCreatedBy(profile.id, setTasks)
    if (tab === 'forwarded') return subscribeForwardedTasks(profile.id, setTasks)
    if (tab === 'mine' || tab === 'overview') return subscribeMyTasks(profile.id, setTasks)
    return subscribeMyTasks(profile.id, setTasks)
  }, [profile, tab])

  useEffect(() => {
    void listDepartments().then(setDepartments).catch(() => setDepartments([]))
    if (profile) {
      void listOrgTaskMemberCandidates(profile).then(setUsers).catch(() => setUsers([]))
    }
  }, [profile?.id])

  useEffect(() => {
    const ids = tasks.flatMap((t) => [t.createdBy, ...t.assigneeIds, ...(t.initialAssigneeIds ?? [])])
    void loadUsersByIds(ids).then(setUsersById)
  }, [tasks])

  const filtered = useMemo(() => {
    let base = tasks
    if (tab === 'completed') base = tasks.filter((t) => t.status === 'completed')
    else if (tab === 'overdue') base = tasks.filter((t) => isTaskOverdue(t))
    else if (tab === 'today') base = tasks.filter((t) => isTaskDueToday(t))
    else if (tab === 'overview') base = tasks.filter(isTaskPending)
    else if (tab === 'mine') base = tasks.filter(isTaskPending)
    if (tab === 'overview' || tab === 'all') return applyTaskListFilters(base, filters)
    return base
  }, [tasks, tab, filters])

  const metrics = useMemo(() => computeTaskMetrics(tasks), [tasks])
  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])

  const setTab = (id: TaskHubTab) => setSearchParams({ tab: id })

  if (!profile) return null

  const showFilters = tab === 'overview' || tab === 'all'
  const managementTable = tab === 'overview' || tab === 'all'

  return (
    <div className="space-y-3">
      <PageHeader
        compact
        title="Tasks"
        description="Assign, forward, and track work across the organisation."
        action={
          canCreateTasks(profile) ? (
            <Button size="sm" className="h-8" asChild>
              <Link to="/tasks/new">
                <Plus className="h-3.5 w-3.5" />
                Create task
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)]">
        <Metric label="Open" value={metrics.pending + metrics.inProgress} />
        <Metric label="Overdue" value={metrics.overdue} />
        <Metric label="Done" value={metrics.completed} />
        {metrics.needsReview > 0 ? <Metric label="Review" value={metrics.needsReview} /> : null}
      </div>

      <TaskHubNav
        value={tab}
        onChange={setTab}
        showOrganisation={canViewAllTasks(profile)}
      />

      {showFilters ? (
        <TaskManagementFilters
          filters={filters}
          onChange={setFilters}
          departments={departments}
          users={users}
        />
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks" description="Nothing in this list right now." />
      ) : (
        <TaskTable
          tasks={filtered}
          usersById={usersById}
          deptById={deptById}
          management={managementTable}
          compact
        />
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[4.5rem] flex-1 bg-[var(--color-card)] px-2.5 py-1.5 sm:min-w-[5.5rem]">
      <p className="text-[10px] leading-tight text-[var(--color-muted-foreground)]">{label}</p>
      <p className="text-base font-semibold tabular-nums leading-tight">{value}</p>
    </div>
  )
}
