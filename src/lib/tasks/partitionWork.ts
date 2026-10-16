import type { Project, Task } from '@/types'
import { projectProgressPercent } from '@/lib/tasks/projectProgress'

export function partitionTasks(tasks: Task[]): {
  standalone: Task[]
  byProjectId: Map<string, Task[]>
} {
  const standalone: Task[] = []
  const byProjectId = new Map<string, Task[]>()
  for (const task of tasks) {
    if (!task.projectId) {
      standalone.push(task)
      continue
    }
    const list = byProjectId.get(task.projectId) ?? []
    list.push(task)
    byProjectId.set(task.projectId, list)
  }
  return { standalone, byProjectId }
}

export interface ProjectRowModel {
  project: Project
  tasks: Task[]
  progress: number
}

/** Merge project docs with task rows visible in the current list. */
export function buildProjectRows(
  projects: Project[],
  byProjectId: Map<string, Task[]>,
): ProjectRowModel[] {
  const seen = new Set<string>()
  const rows: ProjectRowModel[] = []

  for (const project of projects) {
    seen.add(project.id)
    const tasks = byProjectId.get(project.id) ?? []
    rows.push({
      project,
      tasks,
      progress: projectProgressPercent(tasks),
    })
  }

  for (const [projectId, tasks] of byProjectId.entries()) {
    if (seen.has(projectId)) continue
    rows.push({
      project: {
        id: projectId,
        title: 'Project',
        description: '',
        createdBy: tasks[0]?.createdBy ?? '',
      },
      tasks,
      progress: projectProgressPercent(tasks),
    })
  }

  rows.sort(
    (a, b) =>
      (b.project.updatedAt?.toMillis() ?? 0) - (a.project.updatedAt?.toMillis() ?? 0),
  )
  return rows
}
