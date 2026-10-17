import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { TaskEntryFields } from '@/components/tasks/TaskEntryFields'
import { CreateWorkMenu } from '@/components/common/CreateWorkMenu'
import { MobileFormFooter } from '@/components/common/MobileFormFooter'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { canAddTasksToProject, canCreateTasks } from '@/lib/permissions'
import { resolveTaskDepartmentForAssignees } from '@/lib/tasks/assignment'
import { taskFieldsFromBody } from '@/lib/tasks/taskContent'
import { filterAssigneeCandidates } from '@/lib/tasks/orgDirectory'
import { taskFormSchema, type TaskFormValues } from '@/lib/validation/task'
import { useGoBack } from '@/lib/navigation/useGoBack'
import { listDepartments } from '@/services/departments.service'
import { formatUploadCallableError } from '@/services/uploads.service'
import { addTaskToProject, getProject } from '@/services/projects.service'
import { createTask, subscribeTasksByProject } from '@/services/tasks.service'
import { getUserById, listOrgTaskMemberCandidates } from '@/services/users.service'
import type { AppUser, Department, Project, Task } from '@/types'

export function TaskCreatePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [project, setProject] = useState<Project | null>(null)
  const [projectTasks, setProjectTasks] = useState<Task[]>([])
  const [projectTasksReady, setProjectTasksReady] = useState(!projectId)
  const [projectLoading, setProjectLoading] = useState(Boolean(projectId))
  const [projectError, setProjectError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [orgMembers, setOrgMembers] = useState<AppUser[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const submitLock = useRef(false)

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      body: '',
      assigneeIds: [],
      priority: 'medium',
      requiresReview: false,
    },
  })

  const assigneeIds = form.watch('assigneeIds')
  const body = form.watch('body')
  const priority = form.watch('priority')
  const deadlineAt = form.watch('deadlineAt') ?? ''

  const loadMembers = () => {
    if (!profile) return
    setMembersLoading(true)
    setMembersError(null)
    void listOrgTaskMemberCandidates(profile)
      .then((users) => {
        setOrgMembers(filterAssigneeCandidates(profile, users))
        setMembersError(null)
      })
      .catch((err) => {
        setOrgMembers([])
        setMembersError(err instanceof Error ? err.message : 'Could not load employees')
      })
      .finally(() => setMembersLoading(false))
  }

  useEffect(() => {
    void listDepartments().then(setDepartments)
  }, [])

  useEffect(() => {
    if (!projectId) {
      setProject(null)
      setProjectLoading(false)
      return
    }
    setProjectLoading(true)
    setProjectError(null)
    void getProject(projectId)
      .then((p) => {
        setProject(p)
        if (!p) setProjectError('Project not found')
      })
      .catch(() => setProjectError('Could not load project'))
      .finally(() => setProjectLoading(false))
  }, [projectId])

  useEffect(() => {
    if (!projectId) {
      setProjectTasks([])
      setProjectTasksReady(true)
      return
    }
    setProjectTasksReady(false)
    return subscribeTasksByProject(projectId, (list) => {
      setProjectTasks(list)
      setProjectTasksReady(true)
    })
  }, [projectId])

  useEffect(() => {
    loadMembers()
  }, [profile?.id])

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const deptIds = useMemo(() => departments.map((d) => d.id), [departments])
  const cancelFallback = projectId ? `/projects/${projectId}` : '/'
  const goBack = useGoBack(cancelFallback)

  if (!profile || !canCreateTasks(profile)) {
    return <Navigate to="/" replace />
  }

  if (projectId && (projectLoading || !projectTasksReady)) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">Loading project…</p>
  }

  if (projectId && projectTasksReady && !projectLoading) {
    if (projectError || !project) {
      return (
        <p className="text-sm text-danger">{projectError ?? 'Project not found'}</p>
      )
    }
    if (!canAddTasksToProject(profile, project, projectTasks)) {
      return <Navigate to={`/projects/${projectId}`} replace />
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (submitLock.current) return
    setError(null)
    submitLock.current = true
    setSubmitting(true)
    try {
      const { title, description } = taskFieldsFromBody(values.body)
      const assigneeProfiles: AppUser[] = []
      for (const id of values.assigneeIds) {
        const u = await getUserById(id)
        if (u) assigneeProfiles.push(u)
      }
      const departmentId = resolveTaskDepartmentForAssignees(
        assigneeProfiles,
        profile,
        deptIds,
      )

      const taskPayload = {
        title,
        description,
        assigneeIds: values.assigneeIds,
        priority: values.priority,
        deadlineAt: values.deadlineAt ? new Date(values.deadlineAt) : undefined,
        requiresReview: values.requiresReview,
      }

      const id = project
        ? await addTaskToProject(profile, project, taskPayload, { files: attachments })
        : await createTask(
            profile,
            { ...taskPayload, departmentId },
            { files: attachments },
          )

      if (project) {
        navigate(`/projects/${project.id}`, { state: { taskCreated: true } })
      } else {
        navigate(`/tasks/${id}`, { state: { taskCreated: true } })
      }
    } catch (err) {
      setError(formatUploadCallableError(err))
      submitLock.current = false
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full min-w-0 max-w-6xl shrink-0 border-b border-[var(--color-border)] bg-[var(--color-background)] px-3 py-3 sm:px-4 md:px-6">
        <PageHeader
          compact
          title={project ? 'Add project task' : 'Create task'}
          action={
            <div className="hidden sm:block">
              <CreateWorkMenu />
            </div>
          }
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <form
          id="create-task-form"
          onSubmit={onSubmit}
          className="mx-auto w-full min-w-0 max-w-6xl space-y-3 p-3 pb-24 sm:p-4 sm:pb-6 md:px-6"
        >
          <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
        <TaskEntryFields
          singleLine
          body={body}
          onBodyChange={(v) => form.setValue('body', v)}
          assigneeIds={assigneeIds}
          onAssigneeIdsChange={(ids) => form.setValue('assigneeIds', ids)}
          priority={priority}
          onPriorityChange={(v) => form.setValue('priority', v as TaskFormValues['priority'])}
          deadlineAt={deadlineAt}
          onDeadlineChange={(v) => form.setValue('deadlineAt', v)}
          orgMembers={orgMembers}
          deptById={deptById}
          membersLoading={membersLoading}
          membersError={membersError}
          onRetryMembers={loadMembers}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          bodyError={form.formState.errors.body?.message}
          disabled={submitting}
          actions={
            <>
              <Button type="submit" size="sm" className="h-8 shrink-0 px-3" disabled={submitting}>
                {submitting ? 'Saving…' : project ? 'Add' : 'Create'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="hidden h-8 shrink-0 px-3 sm:inline-flex"
                onClick={() => goBack()}
              >
                Cancel
              </Button>
            </>
          }
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
        </form>
      </div>
      <MobileFormFooter className="sm:hidden shrink-0">
        <Button type="submit" form="create-task-form" className="min-h-11 flex-1" disabled={submitting}>
          {submitting ? 'Saving…' : project ? 'Add to project' : 'Create task'}
        </Button>
        <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => goBack()}>
          Cancel
        </Button>
      </MobileFormFooter>
    </div>
  )
}
