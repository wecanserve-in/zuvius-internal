import { format, isToday } from 'date-fns'
import { Plus, CheckSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/features/auth/AuthContext'
import {
  canAssignTasks,
  canViewAllTasks,
} from '@/lib/permissions'
import {
  isTaskOverdue,
  subscribeAllTasks,
  subscribeMyTasks,
  subscribeTasksCreatedBy,
} from '@/services/tasks.service'
import type { Task } from '@/types'

const priorityVariant: Record<Task['priority'], 'secondary' | 'default' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
}

export type TaskListMode =
  | 'mine'
  | 'all'
  | 'overdue'
  | 'created'
  | 'pending'
  | 'completed'
  | 'today'

const titles: Record<TaskListMode, string> = {
  mine: 'My Tasks',
  all: 'All Tasks',
  overdue: 'Overdue Tasks',
  created: 'Tasks I Created',
  pending: 'Pending Tasks',
  completed: 'Completed Tasks',
  today: 'Due Today',
}

export function TaskListPage({ mode }: { mode: TaskListMode }) {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    if (!profile) return
    if (mode === 'all' && canViewAllTasks(profile)) {
      return subscribeAllTasks(setTasks)
    }
    if (mode === 'created') {
      return subscribeTasksCreatedBy(profile.id, setTasks)
    }
    return subscribeMyTasks(profile.id, setTasks)
  }, [profile, mode])

  const filtered = tasks.filter((t) => {
    if (!profile) return false
    if (mode === 'overdue') return isTaskOverdue(t)
    if (mode === 'created') return t.createdBy === profile.id
    if (mode === 'completed') return t.status === 'completed'
    if (mode === 'pending') {
      return t.status !== 'completed' && t.status !== 'cancelled'
    }
    if (mode === 'today') {
      return t.deadlineAt ? isToday(t.deadlineAt.toDate()) : false
    }
    return true
  })

  const title = titles[mode]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {profile && canAssignTasks(profile) ? (
          <Button asChild>
            <Link to="/tasks/new">
              <Plus className="h-4 w-4" />
              New task
            </Link>
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description="Tasks assigned to you will appear here in real time."
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((task) => (
            <Card key={task.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">
                    <Link to={`/tasks/${task.id}`} className="hover:underline">{task.title}</Link>
                  </CardTitle>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
                    {task.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={priorityVariant[task.priority]} className="capitalize">
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className="capitalize">{task.status.replace('_', ' ')}</Badge>
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
