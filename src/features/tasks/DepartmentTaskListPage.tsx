import { format } from 'date-fns'
import { CheckSquare } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateWorkMenu } from '@/components/common/CreateWorkMenu'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthContext'
import { useManagedDepartments } from '@/hooks/useManagedDepartments'
import { canAssignTasks } from '@/lib/permissions'
import { overdueTaskSurfaceClass, sortTasksForDisplay } from '@/lib/tasks/sortTasks'
import { cn } from '@/lib/utils'
import {
  isTaskDueToday,
  isTaskOverdue,
  isTaskPending,
  subscribeDepartmentTasks,
} from '@/services/tasks.service'
import { listMembersForDepartmentIds, loadUsersByIds } from '@/services/users.service'
import type { AppUser, Task } from '@/types'

const priorityVariant: Record<Task['priority'], 'secondary' | 'default' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
}

export function DepartmentTaskListPage() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const { managedIds } = useManagedDepartments()
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<AppUser[]>([])
  const [creatorNames, setCreatorNames] = useState<Map<string, AppUser>>(new Map())

  const [search, setSearch] = useState('')
  const [memberId, setMemberId] = useState('')
  const [status, setStatus] = useState(searchParams.get('filter') ?? 'all')
  const [priority, setPriority] = useState('all')
  const [deadlineFilter, setDeadlineFilter] = useState('all')

  useEffect(() => {
    if (managedIds.length === 0) return
    return subscribeDepartmentTasks(managedIds, setTasks)
  }, [managedIds.join(',')])

  useEffect(() => {
    if (managedIds.length === 0) return
    void listMembersForDepartmentIds(managedIds).then(setMembers)
  }, [managedIds.join(',')])

  useEffect(() => {
    const ids = [...new Set(tasks.map((t) => t.createdBy))]
    void loadUsersByIds(ids, creatorNames).then(setCreatorNames)
  }, [tasks])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = tasks.filter((t) => {
      if (memberId && !t.assigneeIds.includes(memberId)) return false
      if (status === 'pending' && !isTaskPending(t)) return false
      if (status === 'completed' && t.status !== 'completed') return false
      if (status === 'overdue' && !isTaskOverdue(t)) return false
      if (status === 'today' && !isTaskDueToday(t)) return false
      if (priority !== 'all' && t.priority !== priority) return false
      if (deadlineFilter === 'has' && !t.deadlineAt) return false
      if (deadlineFilter === 'none' && t.deadlineAt) return false
      if (q) {
        const hay = `${t.title} ${t.description}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return sortTasksForDisplay(list)
  }, [tasks, search, memberId, status, priority, deadlineFilter])

  if (!profile || managedIds.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        No department is linked to your account.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Department tasks</h2>
        {canAssignTasks(profile) ? <CreateWorkMenu /> : null}
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Title or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Member</Label>
            <select
              className="flex h-10 w-full rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-sm"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              <option value="">All members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.displayName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="flex h-10 w-full rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due today</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <select
              className="flex h-10 w-full rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Deadline</Label>
            <select
              className="flex h-10 w-full rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-sm"
              value={deadlineFilter}
              onChange={(e) => setDeadlineFilter(e.target.value)}
            >
              <option value="all">Any</option>
              <option value="has">Has deadline</option>
              <option value="none">No deadline</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description="Tasks for your department appear here in real time."
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((task) => (
            <Card key={task.id} className={cn('border', overdueTaskSurfaceClass(isTaskOverdue(task)))}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">
                    <Link to={`/tasks/${task.id}`} className="hover:underline">{task.title}</Link>
                  </CardTitle>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
                    {task.description}
                  </p>
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                    Created by {creatorNames.get(task.createdBy)?.displayName ?? '—'} ·{' '}
                    {task.assigneeIds.length} assignee(s)
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={priorityVariant[task.priority]} className="capitalize">
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 text-xs text-[var(--color-muted-foreground)]">
                <span>
                  Deadline:{' '}
                  {task.deadlineAt ? format(task.deadlineAt.toDate(), 'MMM d, yyyy HH:mm') : 'None'}
                </span>
                {isTaskOverdue(task) ? (
                  <span className="font-medium text-[var(--color-destructive)]">Overdue</span>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
