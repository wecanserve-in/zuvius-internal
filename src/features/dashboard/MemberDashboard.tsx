import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/features/auth/AuthContext'
import { TaskTable } from '@/features/tasks/TaskTable'
import { isTaskPending, subscribeMyTasks } from '@/services/tasks.service'
import { loadUsersByIds } from '@/services/users.service'
import type { AppUser, Task } from '@/types'

/** Assignee-only snapshot — created projects and “created by me” live on the Tasks page. */
export function MemberDashboard() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())

  useEffect(() => {
    if (!profile) return
    return subscribeMyTasks(profile.id, setTasks)
  }, [profile])

  useEffect(() => {
    const ids = tasks.flatMap((t) => t.assigneeIds)
    void loadUsersByIds(ids).then(setUsersById)
  }, [tasks])

  const myOpen = useMemo(
    () =>
      tasks.filter(
        (t) => isTaskPending(t) && profile && t.assigneeIds.includes(profile.id),
      ),
    [tasks, profile?.id],
  )

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        compact
        title={`Hello, ${profile?.displayName.split(' ')[0] ?? 'there'}`}
        action={
          <Link
            to="/tasks?scope=yours&tab=mine&kind=tasks"
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            All tasks
          </Link>
        }
      />

      <TaskTable
        tasks={myOpen}
        usersById={usersById}
        compact
        showAssignee={false}
        quickCompleteActor={profile}
      />

      <p className="text-sm text-[var(--color-muted-foreground)]">
        Projects and tasks you created are under{' '}
        <Link
          to="/tasks?scope=yours&tab=created&kind=projects"
          className="text-[var(--color-primary)] hover:underline"
        >
          Tasks → Your work → Created by me
        </Link>
        .{' '}
        <Link to="/messages" className="text-[var(--color-primary)] hover:underline">
          Messages
        </Link>{' '}
        for department and direct chats.
      </p>
    </div>
  )
}
