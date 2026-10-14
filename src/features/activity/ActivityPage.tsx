import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthContext'
import { useManagedDepartments } from '@/hooks/useManagedDepartments'
import { hasMinRole } from '@/lib/permissions'
import { subscribeRecentActivity } from '@/services/activity.service'
import { subscribeDepartmentTasks } from '@/services/tasks.service'
import type { ActivityLog, Task } from '@/types'

export function ActivityPage() {
  const { profile } = useAuth()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [deptTasks, setDeptTasks] = useState<Task[]>([])
  const { managedIds } = useManagedDepartments()
  const isDeptAdmin = profile && !hasMinRole(profile, 'admin') && profile.role === 'department_admin'

  useEffect(() => subscribeRecentActivity(setLogs), [])

  useEffect(() => {
    if (!isDeptAdmin || managedIds.length === 0) return
    return subscribeDepartmentTasks(managedIds, setDeptTasks)
  }, [isDeptAdmin, managedIds.join(',')])

  const deptTaskIds = useMemo(() => new Set(deptTasks.map((t) => t.id)), [deptTasks])

  const visibleLogs = useMemo(() => {
    if (!isDeptAdmin) return logs
    return logs.filter(
      (log) => log.entityType !== 'task' || deptTaskIds.has(log.entityId),
    )
  }, [logs, isDeptAdmin, deptTaskIds])

  return (
    <div className="mx-auto max-w-2xl space-y-2">
      {visibleLogs.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">No recent activity.</p>
      ) : null}
      {visibleLogs.map((log) => (
        <Card key={log.id} className="p-4 text-sm">
          <p className="font-medium">{log.action}</p>
          <p className="text-[var(--color-muted-foreground)]">
            {log.entityType}
            {log.entityType === 'task' ? (
              <> · <Link className="underline" to={`/tasks/${log.entityId}`}>View task</Link></>
            ) : (
              <> · {log.entityId}</>
            )}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {log.createdAt ? format(log.createdAt.toDate(), 'PPpp') : ''}
          </p>
        </Card>
      ))}
    </div>
  )
}
