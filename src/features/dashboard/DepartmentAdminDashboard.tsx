import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/features/auth/AuthContext'
import { TaskTable } from '@/features/tasks/TaskTable'
import { useManagedDepartments } from '@/hooks/useManagedDepartments'
import { isTaskPending, subscribeMyTasks } from '@/services/tasks.service'
import { loadUsersByIds } from '@/services/users.service'
import type { AppUser, Task } from '@/types'

/** Personal assignments on the dashboard; department work lives on Tasks → Department. */
export function DepartmentAdminDashboard() {
  const { profile } = useAuth()
  const { managed } = useManagedDepartments()
  const [tasks, setTasks] = useState<Task[]>([])
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())

  useEffect(() => {
    if (!profile) return
    return subscribeMyTasks(profile.id, setTasks)
  }, [profile?.id])

  useEffect(() => {
    const ids = tasks.flatMap((t) => t.assigneeIds)
    void loadUsersByIds(ids).then(setUsersById)
  }, [tasks])

  const myOpen = useMemo(
    () =>
      tasks.filter(
        (t) => profile && t.assigneeIds.includes(profile.id) && isTaskPending(t),
      ),
    [tasks, profile?.id],
  )

  const deptLabel =
    managed.length === 0 ? 'Department' : managed.map((d) => d.name).join(', ')

  if (!profile) return null

  if (managed.length === 0) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-sm text-[var(--color-muted-foreground)]">
        <p className="font-medium text-[var(--color-foreground)]">Department not linked</p>
        <p className="mt-2">
          Ask an org admin to assign you to a department and grant department admin access.
        </p>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        compact
        title={deptLabel}
        description={`Hello, ${profile.displayName.split(' ')[0] ?? 'there'} — your current assignments`}
        action={
          <Link
            to="/tasks?scope=org&kind=projects"
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Department tasks
          </Link>
        }
      />

      <TaskTable tasks={myOpen} usersById={usersById} compact showAssignee={false} />

      <p className="text-sm text-[var(--color-muted-foreground)]">
        Manage{' '}
        <Link to="/tasks?scope=org&kind=projects" className="text-[var(--color-primary)] hover:underline">
          {deptLabel}
        </Link>{' '}
        projects and tasks on the Tasks page. Personal lists (created, forwarded, overdue) are under{' '}
        <Link
          to="/tasks?scope=yours&tab=mine&kind=tasks"
          className="text-[var(--color-primary)] hover:underline"
        >
          Your work
        </Link>
        .{' '}
        <Link to="/activity" className="text-[var(--color-primary)] hover:underline">
          Activity
        </Link>{' '}
        for recent updates.
      </p>
    </div>
  )
}
