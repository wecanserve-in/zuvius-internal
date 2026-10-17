import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { TaskEntryFields } from '@/components/tasks/TaskEntryFields'
import { CreateWorkMenu } from '@/components/common/CreateWorkMenu'
import { MobileFormFooter } from '@/components/common/MobileFormFooter'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DueDateTimeField } from '@/components/tasks/DueDateTimeField'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthContext'
import { useGoBack } from '@/lib/navigation/useGoBack'
import { canCreateTasks } from '@/lib/permissions'
import { resolveTaskDepartmentForAssignees } from '@/lib/tasks/assignment'
import { taskDisplayTitle, taskFieldsFromBody } from '@/lib/tasks/taskContent'
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
  const submitLock = useRef(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [orgMembers, setOrgMembers] = useState<AppUser[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [workingError, setWorkingError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [savedTasks, setSavedTasks] = useState<DraftRow[]>([])
  const [workingDraft, setWorkingDraft] = useState<DraftRow>(() => newDraft())

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
  const goBack = useGoBack('/')

  if (!profile || !canCreateTasks(profile)) {
    return <Navigate to="/" replace />
  }

  const patchWorking = (patch: Partial<DraftRow>) => {
    setWorkingDraft((d) => ({ ...d, ...patch }))
    setWorkingError(null)
  }

  const workingHasContent =
    workingDraft.body.trim().length > 0 || workingDraft.assigneeIds.length > 0

  const confirmWorkingTask = () => {
    setWorkingError(null)
    const parsed = projectTaskDraftSchema.safeParse(workingDraft)
    if (!parsed.success) {
      setWorkingError(parsed.error.errors[0]?.message ?? 'Complete this task')
      return
    }
    setSavedTasks((list) => [...list, { ...workingDraft }])
    setWorkingDraft(newDraft())
    setError(null)
  }

  const removeSaved = (id: string) => {
    setSavedTasks((list) => list.filter((r) => r.id !== id))
  }

  const editSaved = (row: DraftRow) => {
    setSavedTasks((list) => list.filter((r) => r.id !== row.id))
    setWorkingDraft(row)
    setWorkingError(null)
  }

  const onSubmit = projectForm.handleSubmit(async (values) => {
    if (submitLock.current) return
    setError(null)
    setWorkingError(null)

    if (savedTasks.length === 0) {
      if (workingHasContent) {
        setError('Click the checkmark to add this task, or clear the row.')
        return
      }
      setError('Add at least one task to the project.')
      return
    }
    if (workingHasContent) {
      setError('Click the checkmark to add the current task, or clear it before creating the project.')
      return
    }

    submitLock.current = true
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
      submitLock.current = false
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-3 pb-28 sm:pb-0">
      <PageHeader
        compact
        title="Create project"
        action={
          <div className="hidden sm:block">
            <CreateWorkMenu />
          </div>
        }
      />

      <form id="create-project-form" onSubmit={onSubmit} className="space-y-3">
        <section
          className="inline-flex w-full max-w-2xl flex-col gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2 md:w-auto md:flex-row md:flex-nowrap md:items-center md:gap-2"
        >
          <Input
            id="project-body"
            className="h-7 w-full min-w-[10rem] border-0 bg-transparent px-0 text-sm shadow-none placeholder:text-[var(--color-muted-foreground)] focus-visible:ring-0 md:w-[14rem]"
            placeholder="Project title"
            {...projectForm.register('body')}
          />
          <DueDateTimeField
            id="project-due"
            label="Project due"
            value={projectForm.watch('deadlineAt') ?? ''}
            onChange={(v) => projectForm.setValue('deadlineAt', v)}
            disabled={submitting}
            inline
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium px-0.5">Tasks</h2>

          {savedTasks.length > 0 ? (
            <ul className="divide-y rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm">
              {savedTasks.map((row, index) => {
                const title = taskDisplayTitle(taskFieldsFromBody(row.body))
                const assignee = row.assigneeIds
                  .map((id) => orgMembers.find((u) => u.id === id)?.displayName)
                  .filter(Boolean)
                  .join(', ')
                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-2 px-2 py-1.5 sm:px-3"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                    <span className="text-xs text-[var(--color-muted-foreground)] w-4">{index + 1}.</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                    <span className="text-xs capitalize text-[var(--color-muted-foreground)]">
                      {row.priority}
                    </span>
                    <span className="hidden text-xs text-[var(--color-muted-foreground)] sm:inline">
                      {assignee}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      aria-label="Edit task"
                      onClick={() => editSaved(row)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      aria-label="Remove task"
                      onClick={() => removeSaved(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : null}

          <div
            className="rounded-md border border-[var(--color-primary)]/25 bg-[var(--color-card)] p-2 sm:p-3"
          >
            <TaskEntryFields
              singleLine
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
              actions={
                <Button
                  type="button"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label="Add task to project"
                  title="Add task"
                  onClick={confirmWorkingTask}
                  disabled={submitting}
                >
                  <Check className="h-4 w-4" />
                </Button>
              }
            />
            {workingError ? <p className="mt-1 text-xs text-danger">{workingError}</p> : null}
          </div>
        </section>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="hidden flex-wrap gap-2 sm:flex">
          <Button type="submit" disabled={submitting || savedTasks.length === 0}>
            {submitting ? 'Saving…' : 'Create project'}
          </Button>
          <Button type="button" variant="outline" onClick={() => goBack()}>
            Cancel
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
        <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => goBack()}>
          Cancel
        </Button>
      </MobileFormFooter>
    </div>
  )
}
