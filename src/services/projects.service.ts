import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import {
  canAccessProject,
  canAddTasksToProject,
  canCreateTasks,
  hasMinRole,
  isDepartmentAdminOnly,
} from '@/lib/permissions'
import { taskFieldsFromBody } from '@/lib/tasks/taskContent'
import { resolveTaskDepartmentForAssignees } from '@/lib/tasks/assignment'
import {
  createTask,
  getTask,
  type CreateTaskInput,
  validateTaskAssignees,
} from '@/services/tasks.service'
import { listDepartments } from '@/services/departments.service'
import { getUserById } from '@/services/users.service'
import type { AppUser, Project, Task } from '@/types'

const projectsCol = collection(db, 'projects')

function mapProject(id: string, data: Record<string, unknown>): Project {
  return {
    id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    createdBy: String(data.createdBy ?? ''),
    departmentId: data.departmentId ? String(data.departmentId) : undefined,
    deadlineAt: data.deadlineAt as Project['deadlineAt'],
    creationStatus: data.creationStatus as Project['creationStatus'],
    taskCount: data.taskCount != null ? Number(data.taskCount) : undefined,
    createdAt: data.createdAt as Project['createdAt'],
    updatedAt: data.updatedAt as Project['updatedAt'],
  }
}

export interface ProjectTaskDraftInput {
  body: string
  assigneeIds: string[]
  priority: Task['priority']
  deadlineAt?: Date
}

export interface CreateProjectInput {
  body: string
  deadlineAt?: Date
  departmentId?: string
  tasks: ProjectTaskDraftInput[]
}

export async function createProjectWithTasks(
  actor: AppUser,
  input: CreateProjectInput,
  departmentFallbackIds: string[],
): Promise<string> {
  if (!canCreateTasks(actor)) {
    throw new Error('You do not have permission to create projects')
  }
  if (input.tasks.length === 0) {
    throw new Error('Add at least one task to the project')
  }

  const { title, description } = taskFieldsFromBody(input.body)
  const projectRef = doc(projectsCol)
  const projectId = projectRef.id

  await setDoc(projectRef, {
    title,
    description,
    createdBy: actor.id,
    departmentId: input.departmentId ?? null,
    deadlineAt: input.deadlineAt ?? null,
    creationStatus: 'complete',
    taskCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const createdTaskIds: string[] = []
  let partial = false

  for (const draft of input.tasks) {
    try {
      const fields = taskFieldsFromBody(draft.body)
      const assigneeProfiles: AppUser[] = []
      for (const id of draft.assigneeIds) {
        const u = await getUserById(id)
        if (u) assigneeProfiles.push(u)
      }
      const departmentId =
        input.departmentId ??
        resolveTaskDepartmentForAssignees(assigneeProfiles, actor, departmentFallbackIds)

      await validateTaskAssignees(actor, departmentId, draft.assigneeIds)

      const taskId = await createTask(actor, {
        title: fields.title,
        description: fields.description,
        departmentId,
        projectId,
        assigneeIds: draft.assigneeIds,
        priority: draft.priority,
        deadlineAt: draft.deadlineAt,
      })
      createdTaskIds.push(taskId)
    } catch (err) {
      console.error('project task creation failed', err)
      partial = true
    }
  }

  await updateDoc(projectRef, {
    taskCount: createdTaskIds.length,
    creationStatus: partial ? 'partial' : 'complete',
    updatedAt: serverTimestamp(),
    ...(input.departmentId ? {} : createdTaskIds.length
      ? { departmentId: (await getTask(createdTaskIds[0]))?.departmentId ?? null }
      : {}),
  })

  if (createdTaskIds.length === 0) {
    throw new Error('Project was created but no tasks could be saved. Open the project to retry.')
  }

  return projectId
}

/** Create a task linked to an existing project and bump its task count. */
export async function addTaskToProject(
  actor: AppUser,
  project: Project,
  input: Omit<CreateTaskInput, 'projectId' | 'departmentId'> & { departmentId?: string },
  options?: { files?: File[] },
): Promise<string> {
  if (!canAddTasksToProject(actor, project)) {
    throw new Error('You do not have permission to add tasks to this project')
  }
  assertProjectAccess(actor, project)

  let departmentId = project.departmentId ?? input.departmentId
  if (!departmentId) {
    const assigneeProfiles: AppUser[] = []
    for (const id of input.assigneeIds) {
      const u = await getUserById(id)
      if (u) assigneeProfiles.push(u)
    }
    const departments = await listDepartments()
    departmentId = resolveTaskDepartmentForAssignees(
      assigneeProfiles,
      actor,
      departments.map((d) => d.id),
    )
  }
  if (!departmentId) {
    throw new Error('Department is required for this task')
  }

  const taskId = await createTask(
    actor,
    {
      ...input,
      departmentId,
      projectId: project.id,
    },
    options,
  )

  try {
    await updateDoc(doc(db, 'projects', project.id), {
      taskCount: increment(1),
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    console.error('project taskCount increment failed', err)
  }

  return taskId
}

export async function getProject(projectId: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, 'projects', projectId))
  if (!snap.exists()) return null
  return mapProject(snap.id, snap.data())
}

export function subscribeProject(
  projectId: string,
  onData: (project: Project | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'projects', projectId), (snap) => {
    if (!snap.exists()) {
      onData(null)
      return
    }
    onData(mapProject(snap.id, snap.data()))
  })
}

export function subscribeProjectsCreatedBy(
  userId: string,
  onData: (projects: Project[]) => void,
): Unsubscribe {
  const q = query(projectsCol, where('createdBy', '==', userId))
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => mapProject(d.id, d.data()))
    items.sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
    onData(items)
  })
}

export function subscribeAllProjects(onData: (projects: Project[]) => void): Unsubscribe {
  return onSnapshot(projectsCol, (snap) => {
    const items = snap.docs.map((d) => mapProject(d.id, d.data()))
    items.sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
    onData(items)
  })
}

function mergeProjects(chunks: Project[][]): Project[] {
  const byId = new Map<string, Project>()
  for (const list of chunks) {
    for (const p of list) byId.set(p.id, p)
  }
  return [...byId.values()].sort(
    (a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0),
  )
}

/**
 * Projects visible alongside the current tasks hub / dashboard context.
 */
export function subscribeProjectsForWorkView(
  actor: AppUser,
  options: {
    orgWide?: boolean
    departmentIds?: string[]
    includeCreatedByUser?: boolean
  },
  onData: (projects: Project[]) => void,
): Unsubscribe {
  if (options.orgWide && hasMinRole(actor, 'admin')) {
    return subscribeAllProjects(onData)
  }

  const chunks: Project[][] = [[], []]
  const emit = () => onData(mergeProjects(chunks))

  const unsubs: Unsubscribe[] = []

  if (options.includeCreatedByUser !== false) {
    unsubs.push(
      subscribeProjectsCreatedBy(actor.id, (list) => {
        chunks[0] = list
        emit()
      }),
    )
  }

  if (isDepartmentAdminOnly(actor) && options.departmentIds?.length) {
    const allowed = new Set(options.departmentIds)
    unsubs.push(
      subscribeAllProjects((list) => {
        chunks[1] = list.filter(
          (p) =>
            p.createdBy === actor.id ||
            (p.departmentId != null && allowed.has(p.departmentId)),
        )
        emit()
      }),
    )
  }

  if (unsubs.length === 0) {
    onData([])
    return () => undefined
  }

  return () => unsubs.forEach((u) => u())
}

/** Load project docs for ids discovered on assigned tasks (e.g. member views). */
export function subscribeProjectsByIds(
  projectIds: string[],
  onData: (projects: Project[]) => void,
): Unsubscribe {
  const ids = [...new Set(projectIds)].filter(Boolean)
  if (ids.length === 0) {
    onData([])
    return () => undefined
  }
  const slots: (Project | null)[] = ids.map(() => null)
  const emit = () => onData(slots.filter(Boolean) as Project[])

  const unsubs = ids.map((id, index) =>
    subscribeProject(id, (project) => {
      slots[index] = project
      emit()
    }),
  )
  return () => unsubs.forEach((u) => u())
}

export function mergeProjectLists(...lists: Project[][]): Project[] {
  return mergeProjects(lists)
}

export function assertProjectAccess(actor: AppUser, project: Project): void {
  if (!canAccessProject(actor, project)) {
    throw new Error('You do not have access to this project')
  }
}
