import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatStrip } from '@/components/common/StatStrip'
import { useAuth } from '@/features/auth/AuthContext'
import { TaskTable } from '@/features/tasks/TaskTable'
import { isTaskDueToday, isTaskOverdue, isTaskPending, subscribeMyTasks } from '@/services/tasks.service'
import { loadUsersByIds } from '@/services/users.service'
import type { AppUser, Task } from '@/types'

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

  const stats = useMemo(() => {
    const dueToday = tasks.filter((t) => isTaskDueToday(t) && isTaskPending(t)).length
    const overdue = tasks.filter((t) => isTaskOverdue(t)).length
    const upcoming = tasks.filter((t) => isTaskPending(t) && !isTaskOverdue(t)).length
    return { dueToday, overdue, upcoming }
  }, [tasks])

  const myOpen = useMemo(
    () => tasks.filter(isTaskPending).slice(0, 12),
    [tasks],
  )

  return (
    <div className="space-y-3">
      <PageHeader
        compact
        title={`Hello, ${profile?.displayName.split(' ')[0] ?? 'there'}`}
        description="Your tasks and messages"
        action={
          <Link
            to="/tasks"
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            View all tasks
          </Link>
        }
      />
      <StatStrip
        items={[
          { label: 'Due today', value: stats.dueToday, href: '/tasks?tab=today' },
          { label: 'Overdue', value: stats.overdue, href: '/tasks?tab=overdue' },
          { label: 'Upcoming', value: stats.upcoming, href: '/tasks?tab=mine' },
        ]}
      />
      <section>
        <h3 className="mb-2 text-sm font-medium">My tasks</h3>
        <TaskTable tasks={myOpen} usersById={usersById} compact />
      </section>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        <Link to="/messages" className="text-[var(--color-primary)] hover:underline">
          Open messages
        </Link>{' '}
        for department and direct chats.
      </p>
    </div>
  )
}
