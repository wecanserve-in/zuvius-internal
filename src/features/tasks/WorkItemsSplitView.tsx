import { CheckSquare, FolderKanban } from 'lucide-react'
import { buildProjectRows, partitionTasks } from '@/lib/tasks/partitionWork'
import { ProjectTable } from '@/features/tasks/ProjectTable'
import { TaskTable } from '@/features/tasks/TaskTable'
import type { AppUser, Department, Project, Task } from '@/types'

export type WorkViewMode = 'split' | 'projects-only' | 'tasks-only'

export function WorkItemsSplitView({
  tasks,
  projects,
  usersById,
  deptById,
  management = false,
  compact = false,
  mode = 'split',
  quickCompleteActor,
}: {
  tasks: Task[]
  projects: Project[]
  usersById?: Map<string, AppUser>
  deptById?: Map<string, Department>
  management?: boolean
  compact?: boolean
  mode?: WorkViewMode
  quickCompleteActor?: AppUser | null
}) {
  const { standalone, byProjectId } = partitionTasks(tasks)
  const projectRows = buildProjectRows(projects, byProjectId)

  const showProjects = mode !== 'tasks-only' && projectRows.length > 0
  const showTasks = mode !== 'projects-only' && standalone.length > 0
  const empty = !showProjects && !showTasks

  if (empty) {
    return (
      <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
        Nothing to show here yet.
      </p>
    )
  }

  if (mode === 'projects-only') {
    return (
      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-project-foreground)]">
          <FolderKanban className="h-4 w-4" aria-hidden />
          Projects
        </h3>
        <ProjectTable rows={projectRows} usersById={usersById} compact={compact} />
      </section>
    )
  }

  if (mode === 'tasks-only') {
    return (
      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <CheckSquare className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
          Individual tasks
        </h3>
        <TaskTable
          tasks={standalone}
          usersById={usersById}
          deptById={deptById}
          management={management}
          compact={compact}
          quickCompleteActor={quickCompleteActor}
        />
      </section>
    )
  }

  return (
    <div className="space-y-4">
      {showProjects ? (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-project-foreground)]">
            <FolderKanban className="h-4 w-4" aria-hidden />
            Projects
          </h3>
          <ProjectTable rows={projectRows} usersById={usersById} compact={compact} />
        </section>
      ) : null}

      {showTasks ? (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium">
            <CheckSquare className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
            Individual tasks
          </h3>
          <TaskTable
            tasks={standalone}
            usersById={usersById}
            deptById={deptById}
            management={management}
            compact={compact}
            quickCompleteActor={quickCompleteActor}
          />
        </section>
      ) : null}
    </div>
  )
}
