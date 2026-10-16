import { format } from 'date-fns'
import { ArrowLeft, CheckCircle2, MessageSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { useAuth } from '@/features/auth/AuthContext'
import { canAccessTask, canDeleteTask } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { isTaskOverdue } from '@/services/tasks.service'
import { taskBodyFromFields } from '@/lib/tasks/taskContent'
import {
  deleteTask,
  subscribeMyAssigneeState,
  subscribeTask,
  subscribeTaskHistory,
  updateAssigneeProgress,
} from '@/services/tasks.service'
import { TaskAttachments } from '@/features/tasks/TaskAttachments'
import { TaskChatPanel } from '@/features/tasks/TaskChatPanel'
import { TaskForwardPanel } from '@/features/tasks/TaskForwardPanel'
import { TaskHistoryTimeline } from '@/features/tasks/TaskHistoryTimeline'
import { ensureProjectParticipant } from '@/lib/projects/participants'
import { canForwardTask } from '@/lib/tasks/handover'
import { listDepartments } from '@/services/departments.service'
import { loadUsersByIds } from '@/services/users.service'
import type { AppUser, Department, Task, TaskAssignee, TaskHistoryEvent } from '@/types'

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const createdBanner = (location.state as { taskCreated?: boolean } | null)?.taskCreated
  const [task, setTask] = useState<Task | null>(null)
  const [myAssignee, setMyAssignee] = useState<TaskAssignee | null>(null)
  const [completionNotes, setCompletionNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [justCompleted, setJustCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState<TaskHistoryEvent[]>([])
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())
  const [departments, setDepartments] = useState<Department[]>([])
  const [forwardOpen, setForwardOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

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
    return subscribeTaskHistory(taskId, setHistory)
  }, [taskId])

  useEffect(() => {
    if (!task?.projectId || !profile) return
    if (!task.assigneeIds.includes(profile.id)) return
    void ensureProjectParticipant(task.projectId, profile.id, task.id).catch(() => undefined)
  }, [task?.id, task?.projectId, profile?.id, task?.assigneeIds.join(',')])

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

  if (!taskId) return null
  if (!task) return <LoadingScreen label="Loading task…" />
  if (!profile || !canAccessTask(profile, task)) {
    return <p className="text-sm text-red-600">You do not have access to this task.</p>
  }

  const isAssignee = task.assigneeIds.includes(profile.id)
  const isFormerAssignee = task.formerAssigneeIds?.includes(profile.id) ?? false
  const myWorkDone = myAssignee?.status === 'completed'
  const showAssigneeActions =
    isAssignee && !myWorkDone && task.status !== 'completed' && task.status !== 'cancelled'
  const showForward = canForwardTask(profile, task, myAssignee?.status)
  const showDelete = canDeleteTask(profile, task)
  const bodyText = taskBodyFromFields(task)
  const dueLabel = task.deadlineAt ? format(task.deadlineAt.toDate(), 'PPp') : 'Not set'
  const overdue = isTaskOverdue(task)

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
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-3 pb-24 sm:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
          <Link to="/tasks">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Tasks
          </Link>
        </Button>
        {task.projectId ? (
          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
            <Link to={`/projects/${task.projectId}`}>View project</Link>
          </Button>
        ) : null}
      </div>

      {createdBanner ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          Task created successfully. The assignee has been notified.
        </p>
      ) : null}

      {isFormerAssignee && !isAssignee ? (
        <p className="rounded-md border bg-[var(--color-muted)]/30 px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
          You previously owned this task. Active actions are for the current assignee.
        </p>
      ) : null}

      <Card className={cn(overdue && 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/35')}>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{bodyText}</p>
              <p
                className={cn(
                  'text-xs',
                  overdue
                    ? 'font-semibold text-red-700 dark:text-red-300'
                    : 'text-[var(--color-muted-foreground)]',
                )}
              >
                <span className={overdue ? '' : 'font-medium text-[var(--color-foreground)]'}>Due:</span>{' '}
                {dueLabel}
                {overdue ? ' · Overdue' : ''}
              </p>
            </div>
            <div className="relative flex shrink-0 flex-wrap items-center gap-1">
              <Badge className="capitalize">{task.priority}</Badge>
              <Badge variant="outline" className="capitalize">
                {task.status.replace('_', ' ')}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setChatOpen((v) => !v)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </Button>
              <TaskChatPanel
                task={task}
                history={history}
                profile={profile}
                open={chatOpen}
                onClose={() => setChatOpen(false)}
              />
            </div>
          </div>

          {history.length > 0 ? (
            <div className="border-y border-[var(--color-border)] py-2">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                History
              </p>
              <TaskHistoryTimeline events={history} usersById={usersById} layout="horizontal" />
            </div>
          ) : null}

          {task.attachmentIds?.length ? (
            <div>
              <p className="mb-1 text-xs font-medium">Attachments</p>
              <TaskAttachments
                attachmentIds={task.attachmentIds}
                attachmentMeta={task.attachmentMeta}
              />
            </div>
          ) : null}

          {showAssigneeActions ? (
            <>
              <div className="hidden flex-col gap-2 border-t pt-3 sm:flex sm:flex-row sm:items-end">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={submitting} onClick={() => void handleMarkComplete()}>
                    Mark complete
                  </Button>
                  {showForward ? (
                    <Button size="sm" variant="outline" onClick={() => setForwardOpen(true)}>
                      Forward
                    </Button>
                  ) : null}
                </div>
                <Textarea
                  className="min-h-[2.5rem] flex-1 text-sm"
                  placeholder="Completion notes (optional)"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                />
              </div>
              <div className="space-y-2 border-t pt-3 sm:hidden">
                <Textarea
                  className="min-h-[2.75rem] text-base"
                  placeholder="Completion notes (optional)"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                />
              </div>
            </>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      {(isAssignee && (myWorkDone || justCompleted)) ? (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="flex gap-3 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm">You marked this task as completed.</p>
          </CardContent>
        </Card>
      ) : null}

      {showDelete ? (
        <Button
          variant="outline"
          size="sm"
          className="text-red-600"
          disabled={submitting}
          onClick={() => void handleDelete()}
        >
          Delete task
        </Button>
      ) : null}

      {showAssigneeActions ? (
        <div
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 p-3 backdrop-blur-md sm:hidden"
        >
          <Button className="min-h-11 flex-1" disabled={submitting} onClick={() => void handleMarkComplete()}>
            Mark complete
          </Button>
          {showForward ? (
            <Button className="min-h-11 shrink-0" variant="outline" onClick={() => setForwardOpen(true)}>
              Forward
            </Button>
          ) : null}
        </div>
      ) : null}

      {forwardOpen ? (
        <TaskForwardPanel
          task={task}
          actor={profile}
          departments={departments}
          usersById={usersById}
          onCancel={() => setForwardOpen(false)}
          onDone={() => {
            setForwardOpen(false)
            navigate('/tasks?scope=yours&tab=mine', { replace: false })
          }}
        />
      ) : null}
    </div>
  )
}
