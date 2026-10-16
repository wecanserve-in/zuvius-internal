import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Calendar, Check, CheckCircle2, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { TaskEntryFields } from '@/components/tasks/TaskEntryFields'
import { CreateWorkMenu } from '@/components/common/CreateWorkMenu'
import { MobileFormFooter } from '@/components/common/MobileFormFooter'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DueDateTimeField } from '@/components/tasks/DueDateTimeField'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/AuthContext'
import { canCreateTasks } from '@/lib/permissions'
import { resolveTaskDepartmentForAssignees } from '@/lib/tasks/assignment'
import { taskFieldsFromBody, taskDisplayTitle } from '@/lib/tasks/taskContent'
import { filterAssigneeCandidates } from '@/lib/tasks/orgDirectory'
import {
  projectFormSchema,
  projectTaskDraftSchema,
  type ProjectFormValues,
  type ProjectTaskDraft,
} from '@/lib/validation/task'
import { listDepartments } from '@/services/departments.service'
import { createProjectWithTasks } from '@/services/projects.service'
import { listOrgTaskMemberCandidates } from '@/services/users.service'
import { cn } from '@/lib/utils'
import type { AppUser, Department } from '@/types'

type DraftRow = ProjectTaskDraft & { id: string }

function newDraft(): DraftRow {
  return {
    id: crypto.randomUUID(),
    body: '',
    assigneeIds: [],
    priority: 'medium',
    deadlineAt: '',
  }
}

export function ProjectCreatePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState<Department[]>([])
  const [orgMembers, setOrgMembers] = useState<AppUser[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [savedTasks, setSavedTasks] = useState<DraftRow[]>([])
  const [workingDraft, setWorkingDraft] = useState<DraftRow>(() => newDraft())
  const [justAdded, setJustAdded] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(true)

  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { body: '', deadlineAt: '' },
  })

  const loadMembers = () => {
    if (!profile) return
    setMembersLoading(true)
    setMembersError(null)
    void listOrgTaskMemberCandidates(profile)
      .then((users) => setOrgMembers(filterAssigneeCandidates(profile, users)))
      .catch((err) => {
        setOrgMembers([])
        setMembersError(err instanceof Error ? err.message : 'Could not load employees')
      })
      .finally(() => setMembersLoading(false))
  }

  useEffect(() => {
    void listDepartments().then(setDepartments)
    loadMembers()
  }, [profile?.id])

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const deptIds = useMemo(() => departments.map((d) => d.id), [departments])

  if (!profile || !canCreateTasks(profile)) {
    return <Navigate to="/tasks" replace />
  }

  const patchWorking = (patch: Partial<DraftRow>) => {
    setWorkingDraft((d) => ({ ...d, ...patch }))
    setJustAdded(false)
  }

  const confirmWorkingTask = () => {
    setTaskError(null)
    const parsed = projectTaskDraftSchema.safeParse(workingDraft)
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Complete the task fields'
      setTaskError(msg)
      return
    }
    setSavedTasks((list) => [...list, { ...workingDraft }])
    setWorkingDraft(newDraft())
    setJustAdded(true)
    setTaskFormOpen(false)
  }

  const removeSaved = (id: string) => {
    setSavedTasks((list) => list.filter((r) => r.id !== id))
  }

  const editSaved = (row: DraftRow) => {
    setSavedTasks((list) => list.filter((r) => r.id !== row.id))
    setWorkingDraft(row)
    setJustAdded(false)
    setTaskError(null)
    setTaskFormOpen(true)
  }

  const startNewTask = () => {
    setWorkingDraft(newDraft())
    setTaskError(null)
    setJustAdded(false)
  }

  const openTaskForm = () => {
    setTaskFormOpen(true)
    setJustAdded(false)
  }

  const workingHasContent =
    workingDraft.body.trim().length > 0 || workingDraft.assigneeIds.length > 0

  const onSubmit = projectForm.handleSubmit(async (values) => {
    setError(null)
    if (savedTasks.length === 0) {
      if (workingHasContent) {
        setError('Click the checkmark to add this task to the project, or clear the form.')
        return
      }
      setError('Add at least one task to the project.')
      return
    }
    if (workingHasContent) {
      setError('Confirm the current task with the checkmark, or clear it before creating the project.')
      return
    }

    setSubmitting(true)
    try {
      const firstAssignees = orgMembers.filter((u) =>
        savedTasks[0]?.assigneeIds.includes(u.id),
      )
      const departmentId = resolveTaskDepartmentForAssignees(firstAssignees, profile, deptIds)

      const projectId = await createProjectWithTasks(
        profile,
        {
          body: values.body,
          deadlineAt: values.deadlineAt ? new Date(values.deadlineAt) : undefined,
          departmentId,
          tasks: savedTasks.map((d) => ({
            body: d.body,
            assigneeIds: d.assigneeIds,
            priority: d.priority,
            deadlineAt: d.deadlineAt ? new Date(d.deadlineAt) : undefined,
          })),
        },
        deptIds,
      )
      navigate(`/projects/${projectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-3 pb-28 sm:pb-0">
      <PageHeader
        compact
        title="Create project"
        description="Add each task with the checkmark, then create the project when the list is complete."
        action={
          <div className="hidden sm:block">
            <CreateWorkMenu />
          </div>
        }
      />

      <form id="create-project-form" onSubmit={onSubmit} className="space-y-4">
        <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_12rem]">
            <div className="space-y-1">
              <Label htmlFor="project-body">Project</Label>
              <Textarea
                id="project-body"
                rows={3}
                className="text-sm"
                placeholder="Project name and brief scope"
                {...projectForm.register('body')}
              />
            </div>
            <DueDateTimeField
              id="project-due"
              label="Project due"
              value={projectForm.watch('deadlineAt') ?? ''}
              onChange={(v) => projectForm.setValue('deadlineAt', v)}
              disabled={submitting}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium">Tasks in this project</h2>

          {savedTasks.length > 0 ? (
            <ul className="divide-y rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
              {savedTasks.map((row, index) => {
                const fields = taskFieldsFromBody(row.body)
                const title = taskDisplayTitle(fields)
                const assignee = row.assigneeIds
                  .map((id) => orgMembers.find((u) => u.id === id)?.displayName)
                  .filter(Boolean)
                  .join(', ')
                const dueLabel = row.deadlineAt
                  ? format(new Date(row.deadlineAt), 'MMM d, h:mm a')
                  : null
                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
                  >
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-600"
                      aria-label="Added to project"
                    />
                    <span className="text-xs text-[var(--color-muted-foreground)] w-5">
                      {index + 1}.
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                    <span className="text-xs capitalize text-[var(--color-muted-foreground)]">
                      {row.priority}
                    </span>
                    {dueLabel ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                        <Calendar className="h-3 w-3" aria-hidden />
                        {dueLabel}
                      </span>
                    ) : null}
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {assignee}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Edit task"
                      onClick={() => editSaved(row)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Remove task"
                      onClick={() => removeSaved(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-4 text-sm text-[var(--color-muted-foreground)]">
              No tasks yet. Open <strong>Add task</strong> below, fill in the details, and click the
              checkmark.
            </p>
          )}

          {justAdded && !taskFormOpen ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Task added. Click <strong>Add task</strong> to add another, or create the project.
            </p>
          ) : null}

          <div
            className={cn(
              'overflow-hidden rounded-md border bg-[var(--color-card)]',
              taskFormOpen
                ? 'border-[var(--color-primary)]/30'
                : 'border-[var(--color-border)]',
            )}
          >
            <button
              type="button"
              onClick={() => (taskFormOpen ? setTaskFormOpen(false) : openTaskForm())}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-[var(--color-muted)]/30"
              aria-expanded={taskFormOpen}
            >
              <span className="inline-flex items-center gap-2">
                {!taskFormOpen ? <Plus className="h-4 w-4 text-[var(--color-primary)]" /> : null}
                {taskFormOpen
                  ? savedTasks.length === 0
                    ? 'Add first task'
                    : 'Add task'
                  : 'Add task'}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform',
                  taskFormOpen && 'rotate-180',
                )}
                aria-hidden
              />
            </button>

            {taskFormOpen ? (
              <div className="space-y-3 border-t border-[var(--color-border)] bg-[var(--color-muted)]/10 p-4">
                <TaskEntryFields
                  body={workingDraft.body}
                  onBodyChange={(v) => patchWorking({ body: v })}
                  assigneeIds={workingDraft.assigneeIds}
                  onAssigneeIdsChange={(ids) => patchWorking({ assigneeIds: ids })}
                  priority={workingDraft.priority}
                  onPriorityChange={(v) =>
                    patchWorking({ priority: v as ProjectTaskDraft['priority'] })
                  }
                  deadlineAt={workingDraft.deadlineAt ?? ''}
                  onDeadlineChange={(v) => patchWorking({ deadlineAt: v })}
                  orgMembers={orgMembers}
                  deptById={deptById}
                  membersLoading={membersLoading}
                  membersError={membersError}
                  onRetryMembers={loadMembers}
                  disabled={submitting}
                />
                {taskError ? <p className="text-sm text-red-600">{taskError}</p> : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={confirmWorkingTask}
                    disabled={submitting}
                    className="gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    Add task to project
                  </Button>
                  {workingHasContent ? (
                    <Button type="button" size="sm" variant="outline" onClick={startNewTask}>
                      Clear form
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="hidden flex-wrap gap-2 sm:flex">
          <Button type="submit" disabled={submitting || savedTasks.length === 0}>
            {submitting ? 'Saving…' : 'Create project'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/tasks">Cancel</Link>
          </Button>
        </div>
      </form>
      <MobileFormFooter className="sm:hidden">
        <Button
          type="submit"
          form="create-project-form"
          className="min-h-11 flex-1"
          disabled={submitting || savedTasks.length === 0}
        >
          {submitting ? 'Saving…' : 'Create project'}
        </Button>
        <Button type="button" variant="outline" className="min-h-11 shrink-0" asChild>
          <Link to="/tasks">Cancel</Link>
        </Button>
      </MobileFormFooter>
    </div>
  )
}
