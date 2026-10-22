import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmployeeAdminEditDialog } from '@/components/users/EmployeeAdminEditDialog'
import { useAuth } from '@/features/auth/AuthContext'
import {
  canEditEmployeeAccount,
  canViewDepartmentMember,
  formatUserRole,
  hasMinRole,
} from '@/lib/permissions'
import { subscribeDepartments } from '@/services/departments.service'
import { isTaskOverdue, subscribeMyTasks } from '@/services/tasks.service'
import { getUserById } from '@/services/users.service'
import type { AppUser, Department, Task } from '@/types'

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile } = useAuth()
  const [user, setUser] = useState<AppUser | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [editOpen, setEditOpen] = useState(searchParams.get('edit') === '1')

  useEffect(() => {
    if (!userId) return
    void getUserById(userId).then(setUser)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    return subscribeMyTasks(userId, setTasks)
  }, [userId])

  useEffect(() => {
    return subscribeDepartments(setDepartments)
  }, [])

  useEffect(() => {
    setEditOpen(searchParams.get('edit') === '1')
  }, [searchParams])

  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? id

  if (!userId) return null
  if (!user) return <LoadingScreen label="Loading profile…" />

  const canView =
    profile &&
    (profile.id === user.id ||
      hasMinRole(profile, 'admin') ||
      canViewDepartmentMember(profile, user))

  if (!canView) {
    return (
      <p className="text-sm text-danger">You do not have permission to view this profile.</p>
    )
  }

  const canEdit = profile && canEditEmployeeAccount(profile, user)

  const pending = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
  const completed = tasks.filter((t) => t.status === 'completed')

  const openEdit = () => {
    setEditOpen(true)
    setSearchParams({ edit: '1' }, { replace: true })
  }

  const closeEdit = (open: boolean) => {
    setEditOpen(open)
    if (!open) {
      setSearchParams({}, { replace: true })
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <CardTitle>{user.displayName}</CardTitle>
          {canEdit ? (
            <Button type="button" size="sm" variant="outline" onClick={openEdit}>
              Edit role & department
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-[var(--color-muted-foreground)]">Email:</span> {user.email}</p>
          <p>
            <span className="text-[var(--color-muted-foreground)]">Role:</span>{' '}
            <span className="capitalize">{formatUserRole(user.role)}</span>
          </p>
          <p>
            <span className="text-[var(--color-muted-foreground)]">Department:</span>{' '}
            {user.departmentIds.map(deptName).join(', ') || '—'}
          </p>
          <p><span className="text-[var(--color-muted-foreground)]">Phone:</span> {user.phone ?? '—'}</p>
        </CardContent>
      </Card>

      {canEdit && profile ? (
        <EmployeeAdminEditDialog
          open={editOpen}
          onOpenChange={closeEdit}
          actor={profile}
          employee={user}
          departments={departments}
          onSaved={setUser}
        />
      ) : null}

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
