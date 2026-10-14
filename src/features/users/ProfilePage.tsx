import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { useAuth } from '@/features/auth/AuthContext'
import { canViewDepartmentMember, formatUserRole, hasMinRole } from '@/lib/permissions'
import { isTaskOverdue, subscribeMyTasks } from '@/services/tasks.service'
import { getUserById } from '@/services/users.service'
import type { AppUser, Task } from '@/types'

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { profile } = useAuth()
  const [user, setUser] = useState<AppUser | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    if (!userId) return
    void getUserById(userId).then(setUser)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    return subscribeMyTasks(userId, setTasks)
  }, [userId])

  if (!userId) return null
  if (!user) return <LoadingScreen label="Loading profile…" />

  const canView =
    profile &&
    (profile.id === user.id ||
      hasMinRole(profile, 'admin') ||
      canViewDepartmentMember(profile, user))

  if (!canView) {
    return (
      <p className="text-sm text-red-600">You do not have permission to view this profile.</p>
    )
  }

  const pending = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
  const completed = tasks.filter((t) => t.status === 'completed')

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{user.displayName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-[var(--color-muted-foreground)]">Email:</span> {user.email}</p>
          <p>
            <span className="text-[var(--color-muted-foreground)]">Role:</span>{' '}
            <span className="capitalize">{formatUserRole(user.role)}</span>
          </p>
          <p><span className="text-[var(--color-muted-foreground)]">Phone:</span> {user.phone ?? '—'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No tasks assigned.</p>
          ) : (
            tasks.map((task) => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 hover:bg-[var(--color-muted)]"
              >
                <span className="text-sm font-medium">{task.title}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{task.status.replace('_', ' ')}</Badge>
                  {isTaskOverdue(task) ? (
                    <Badge variant="destructive">Overdue</Badge>
                  ) : null}
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {task.deadlineAt ? format(task.deadlineAt.toDate(), 'MMM d') : 'No deadline'}
                  </span>
                </div>
              </Link>
            ))
          )}
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {pending.length} pending · {completed.length} completed
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
