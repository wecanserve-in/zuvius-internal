import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { BackButton } from '@/components/common/BackButton'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import {
  canAccessProject,
  canAddTasksToProject,
  isMemberProjectOwner,
  userAssignedToProjectTasks,
} from '@/lib/permissions'
import { TaskTable } from '@/features/tasks/TaskTable'
import { ensureProjectParticipant } from '@/lib/projects/participants'
import { projectProgressPercent } from '@/lib/tasks/projectProgress'
import { taskBodyFromFields } from '@/lib/tasks/taskContent'
import { subscribeProject } from '@/services/projects.service'
import { subscribeTasksByProject } from '@/services/tasks.service'
import { loadUsersByIds } from '@/services/users.service'
import type { AppUser, Project, Task } from '@/types'

function syntheticProject(projectId: string, tasks: Task[]): Project {
  const first = tasks[0]
  return {
    id: projectId,
    title: 'Project',
    description: '',
    createdBy: first?.createdBy ?? '',
  }
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()
  const { profile } = useAuth()
  const taskAddedBanner = (location.state as { taskCreated?: boolean } | null)?.taskCreated
  const [project, setProject] = useState<Project | null>(null)
  const [projectLoading, setProjectLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoaded, setTasksLoaded] = useState(false)
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())
  const [participantLinked, setParticipantLinked] = useState(false)

  useEffect(() => {
    if (!projectId) return
    setTasksLoaded(false)
    return subscribeTasksByProject(projectId, (list) => {
      setTasks(list)
      setTasksLoaded(true)
    })
  }, [projectId])

  useEffect(() => {
    if (!projectId || !profile || !tasksLoaded) return
    const mine = tasks.find((t) => t.assigneeIds.includes(profile.id))
    if (!mine) {
      setParticipantLinked(true)
      return
    }
    void ensureProjectParticipant(projectId, profile.id, mine.id)
      .then(() => setParticipantLinked(true))
      .catch(() => setParticipantLinked(true))
  }, [projectId, profile?.id, tasks, tasksLoaded])

  useEffect(() => {
    if (!projectId || !participantLinked) return
    setProjectLoading(true)
    return subscribeProject(projectId, (p) => {
      setProject(p)
      setProjectLoading(false)
    })
  }, [projectId, participantLinked])

  useEffect(() => {
    const ids = tasks.flatMap((t) => [t.createdBy, ...t.assigneeIds])
    void loadUsersByIds(ids).then(setUsersById)
  }, [tasks])

  const progress = useMemo(() => projectProgressPercent(tasks), [tasks])

  if (!projectId) return null

  const assignedHere =
    profile != null && userAssignedToProjectTasks(profile.id, projectId, tasks)

  const displayProject =
    project ?? (assignedHere && tasks.length > 0 ? syntheticProject(projectId, tasks) : null)

  const stillLoading =
    !tasksLoaded || !participantLinked || (projectLoading && !displayProject)

  if (stillLoading) return <LoadingScreen label="Loading project…" />

  if (!profile || !displayProject) {
    return <p className="text-sm text-danger">You do not have access to this project.</p>
  }

  if (
    !canAccessProject(profile, displayProject, { assignedToProjectTask: assignedHere })
  ) {
    return <p className="text-sm text-danger">You do not have access to this project.</p>
  }

  const memberOwnerView = isMemberProjectOwner(profile, displayProject, tasks)
  const assigneeOnlyView = profile.role === 'member' && !memberOwnerView
  const visibleTasks = assigneeOnlyView
    ? tasks.filter((t) => t.assigneeIds.includes(profile.id))
    : tasks
  const showProgress = !assigneeOnlyView
  const canAddTasks = canAddTasksToProject(profile, displayProject, tasks)

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-3">
      {taskAddedBanner ? (
        <p className="surface-success rounded-md px-3 py-2 text-sm">
          Task added to this project.
        </p>
      ) : null}

      <BackButton label="Back" />

      <header className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">{displayProject.title}</h1>
            {showProgress ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-muted-foreground)]">
                {taskBodyFromFields(displayProject)}
              </p>
            ) : null}
          </div>
          {showProgress ? (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Due {displayProject.deadlineAt ? format(displayProject.deadlineAt.toDate(), 'PP') : 'Not set'}
            </p>
          ) : null}
        </div>
        {showProgress ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium">{progress}% complete</span>
              <span className="text-[var(--color-muted-foreground)]">
                {tasks.filter((t) => t.status === 'completed').length} / {tasks.length} tasks done
              </span>
              {displayProject.creationStatus === 'partial' ? (
                <span className="text-warning text-xs">Some tasks failed to save — review list below.</span>
              ) : null}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
              <div
                className="h-full bg-[var(--color-primary)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : null}
      </header>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">
            {assigneeOnlyView ? 'Your tasks' : 'Project tasks'}
          </h2>
          {canAddTasks ? (
            <Button size="sm" className="h-9 shrink-0 gap-1" asChild>
              <Link to={`/tasks/new?projectId=${projectId}`}>
                <Plus className="h-4 w-4 sm:hidden" aria-hidden />
                <span>Add task</span>
              </Link>
            </Button>
          ) : null}
        </div>
        <TaskTable
          tasks={visibleTasks}
          usersById={usersById}
          compact
          showAssignee={showProgress}
        />
        {assigneeOnlyView ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Open a task to complete it or forward it.
          </p>
        ) : null}
      </section>
    </div>
  )
}
