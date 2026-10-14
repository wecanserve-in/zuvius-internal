import { format } from 'date-fns'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { useAuth } from '@/features/auth/AuthContext'
import { canAccessTask, canDeleteTask } from '@/lib/permissions'
import { deriveTaskDisplayContext } from '@/lib/tasks/display'
import { departmentLabelForUser } from '@/lib/tasks/orgDirectory'
import {
  addTaskComment,
  deleteTask,
  subscribeMyAssigneeState,
  subscribeTask,
  subscribeTaskComments,
  subscribeTaskHistory,
  updateAssigneeProgress,
} from '@/services/tasks.service'
import { TaskAttachments } from '@/features/tasks/TaskAttachments'
import { TaskForwardPanel } from '@/features/tasks/TaskForwardPanel'
import { TaskHistoryTimeline } from '@/features/tasks/TaskHistoryTimeline'
import { canForwardTask } from '@/lib/tasks/handover'
import { listDepartments } from '@/services/departments.service'
import { loadUsersByIds } from '@/services/users.service'
import type { AppUser, Department, Task, TaskAssignee, TaskComment, TaskHistoryEvent } from '@/types'

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const createdBanner = (location.state as { taskCreated?: boolean } | null)?.taskCreated
  const [task, setTask] = useState<Task | null>(null)
  const [myAssignee, setMyAssignee] = useState<TaskAssignee | null>(null)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [completionNotes, setCompletionNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [justCompleted, setJustCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState<TaskHistoryEvent[]>([])
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())
  const [departments, setDepartments] = useState<Department[]>([])
  const [forwardOpen, setForwardOpen] = useState(false)

  useEffect(() => {
    if (!taskId) return
    return subscribeTask(taskId, setTask)
  }, [taskId])

  useEffect(() => {
    if (!taskId || !profile) return
    return subscribeMyAssigneeState(taskId, profile.id, setMyAssignee)
  }, [taskId, profile?.id])

  useEffect(() => {
    if (!taskId) return
    return subscribeTaskComments(taskId, setComments)
  }, [taskId])

  useEffect(() => {
    if (!taskId) return
    return subscribeTaskHistory(taskId, setHistory)
  }, [taskId])

  useEffect(() => {
    void listDepartments().then(setDepartments).catch(() => setDepartments([]))
  }, [])

  useEffect(() => {
    if (!task) return
    const ids = new Set<string>([
      task.createdBy,
      ...task.assigneeIds,
      ...(task.formerAssigneeIds ?? []),
      ...(task.initialAssigneeIds ?? []),
      ...history.flatMap((e) =>
        [e.actorId, e.assignedById, e.previousAssigneeId, e.newAssigneeId].filter(Boolean) as string[],
      ),
    ])
    void loadUsersByIds([...ids]).then(setUsersById)
  }, [task, history])

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])

  if (!taskId) return null
  if (!task) return <LoadingScreen label="Loading task…" />
  if (!profile || !canAccessTask(profile, task)) {
    return <p className="text-sm text-red-600">You do not have access to this task.</p>
  }

  const ctx = deriveTaskDisplayContext(task, history, usersById, deptById)
  const isAssignee = task.assigneeIds.includes(profile.id)
  const isFormerAssignee = task.formerAssigneeIds?.includes(profile.id) ?? false
  const myWorkDone = myAssignee?.status === 'completed'
  const showAssigneeActions =
    isAssignee && !myWorkDone && task.status !== 'completed' && task.status !== 'cancelled'
  const showForward = canForwardTask(profile, task, myAssignee?.status)
  const showDelete = canDeleteTask(profile, task)

  const currentUser = usersById.get(task.assigneeIds[0] ?? '')

  const handleDelete = async () => {
    if (!window.confirm('Delete this task permanently?')) return
    setSubmitting(true)
    try {
      await deleteTask(profile, task.id)
      navigate('/tasks', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkComplete = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await updateAssigneeProgress(profile, task.id, 100, 'completed', completionNotes || undefined)
      setJustCompleted(true)
      setCompletionNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
          <Link to="/tasks">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Tasks
          </Link>
        </Button>
      </div>

      {createdBanner ? (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="py-3 text-sm font-medium text-emerald-900 dark:text-emerald-100">
            Task created successfully. The assignee has been notified.
          </CardContent>
        </Card>
      ) : null}

      {ctx.wasForwarded ? (
        <Card className="border-amber-200/80 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="space-y-1 py-3 text-sm">
            <p className="font-medium">Currently assigned to: {ctx.currentAssigneeLabel}</p>
            {currentUser ? (
              <p className="text-[var(--color-muted-foreground)]">
                Department: {departmentLabelForUser(currentUser, deptById)}
              </p>
            ) : null}
            {ctx.lastForwardedByLabel ? (
              <p className="text-[var(--color-muted-foreground)]">
                Last forwarded by: {ctx.lastForwardedByLabel}
              </p>
            ) : null}
            {ctx.lastHandoverNote ? (
              <p className="mt-2 whitespace-pre-wrap rounded-md border bg-[var(--color-card)] p-2 text-xs">
                {ctx.lastHandoverNote}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isFormerAssignee && !isAssignee ? (
        <p className="rounded-md border bg-[var(--color-muted)]/30 px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
          You previously owned this task. View history below; active actions are for the current assignee.
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Card>
            <CardHeader className="space-y-2 p-4 pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-lg leading-snug">{task.title}</CardTitle>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Due {task.deadlineAt ? format(task.deadlineAt.toDate(), 'PP') : 'Not set'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge className="capitalize">{task.priority}</Badge>
                <Badge variant="outline" className="capitalize">
                  {task.status.replace('_', ' ')}
                </Badge>
                <span className="text-[var(--color-muted-foreground)]">
                  {ctx.currentAssigneeLabel}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4 pt-0">
              <p className="whitespace-pre-wrap text-sm text-[var(--color-muted-foreground)]">
                {task.description}
              </p>
              {task.attachmentIds?.length ? (
                <div>
                  <p className="mb-1 text-sm font-medium">Attachments</p>
                  <TaskAttachments uploadIds={task.attachmentIds} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {showAssigneeActions ? (
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Your actions</CardTitle></CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 pt-0">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button disabled={submitting} onClick={() => void handleMarkComplete()}>
                    Mark complete
                  </Button>
                  {showForward ? (
                    <Button variant="outline" onClick={() => setForwardOpen(true)}>
                      Forward task
                    </Button>
                  ) : null}
                </div>
                <Textarea
                  placeholder="Completion notes (optional)"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
              </CardContent>
            </Card>
          ) : null}

          {(isAssignee && (myWorkDone || justCompleted)) ? (
            <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
              <CardContent className="flex gap-3 py-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm">You marked this task as completed.</p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Activity</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <TaskHistoryTimeline events={history} usersById={usersById} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Comments</CardTitle></CardHeader>
            <CardContent className="space-y-3 px-4 pb-4 pt-0">
              {comments.map((c) => (
                <div key={c.id} className="rounded-md border px-3 py-2 text-sm">
                  <p>{c.text}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    {c.createdAt ? format(c.createdAt.toDate(), 'PPp') : ''}
                  </p>
                </div>
              ))}
              <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} />
              <Button
                variant="secondary"
                onClick={() => {
                  if (!commentText.trim()) return
                  void addTaskComment(profile, task.id, commentText.trim()).then(() => setCommentText(''))
                }}
              >
                Add comment
              </Button>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-3">
          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Ownership</CardTitle></CardHeader>
            <CardContent className="space-y-2 px-4 pb-4 pt-0 text-sm">
              <SideField label="Created by" value={ctx.creatorLabel} />
              <SideField label="Originally assigned to" value={ctx.originalAssigneeLabel} />
              <SideField label="Current assignee" value={ctx.currentAssigneeLabel} />
              {currentUser ? (
                <SideField
                  label="Department"
                  value={departmentLabelForUser(currentUser, deptById)}
                />
              ) : null}
              {ctx.assignedByLabel ? (
                <SideField label="Assigned by" value={ctx.assignedByLabel} />
              ) : null}
              {ctx.lastForwardedByLabel ? (
                <SideField label="Last forwarded by" value={ctx.lastForwardedByLabel} />
              ) : null}
              <SideField
                label="Created"
                value={task.createdAt ? format(task.createdAt.toDate(), 'PPp') : '—'}
              />
              <SideField
                label="Last updated"
                value={task.updatedAt ? format(task.updatedAt.toDate(), 'PPp') : '—'}
              />
            </CardContent>
          </Card>
          {showDelete ? (
            <Button
              variant="outline"
              className="w-full text-red-600"
              disabled={submitting}
              onClick={() => void handleDelete()}
            >
              Delete task
            </Button>
          ) : null}
        </aside>
      </div>

      {forwardOpen ? (
        <TaskForwardPanel
          task={task}
          actor={profile}
          departments={departments}
          usersById={usersById}
          onCancel={() => setForwardOpen(false)}
          onDone={() => {
            setForwardOpen(false)
            navigate('/tasks?tab=mine', { replace: false })
          }}
        />
      ) : null}
    </div>
  )
}

function SideField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
