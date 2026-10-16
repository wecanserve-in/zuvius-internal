import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { ensureProjectParticipant } from '@/lib/projects/participants'
import type {
  AppUser,
  Task,
  TaskAssignee,
  TaskComment,
  TaskHistoryEvent,
  TaskStatus,
} from '@/types'
import { isEligibleForwardRecipient, isEligibleTaskAssignee } from '@/lib/permissions/forwarding'
import {
  buildHandoverAssigneeIds,
  canForwardTask,
  validateHandoverNote,
} from '@/lib/tasks/handover'
import { mergeTasksByUpdatedAt } from '@/lib/tasks/mergeTasks'
import {
  canAccessTask,
  canCreateTasks,
  canDeleteTask,
} from '@/lib/permissions'
import { getUserById } from '@/services/users.service'
import { notifyTaskAssigneeCompleted, notifyTaskHandover } from '@/services/taskNotifications.service'
import { postTaskCreatedChatEvents, postTaskHandoverChatEvents } from '@/services/taskChat.service'
import { uploadFilesForNewTask } from '@/services/uploads.service'

const tasksCol = collection(db, 'tasks')

function mapTask(id: string, data: Record<string, unknown>): Task {
  return {
    id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    createdBy: String(data.createdBy ?? ''),
    departmentId: data.departmentId ? String(data.departmentId) : undefined,
    assigneeIds: Array.isArray(data.assigneeIds) ? data.assigneeIds.map(String) : [],
    initialAssigneeIds: Array.isArray(data.initialAssigneeIds)
      ? data.initialAssigneeIds.map(String)
      : undefined,
    priority: (data.priority as Task['priority']) ?? 'medium',
    status: (data.status as Task['status']) ?? 'todo',
    deadlineAt: data.deadlineAt as Task['deadlineAt'],
    startAt: data.startAt as Task['startAt'],
    requiresReview: Boolean(data.requiresReview),
    category: data.category ? String(data.category) : undefined,
    attachmentIds: Array.isArray(data.attachmentIds)
      ? data.attachmentIds.map(String)
      : undefined,
    attachmentMeta: Array.isArray(data.attachmentMeta)
      ? (data.attachmentMeta as Task['attachmentMeta'])
      : undefined,
    formerAssigneeIds: Array.isArray(data.formerAssigneeIds)
      ? data.formerAssigneeIds.map(String)
      : undefined,
    forwardedByIds: Array.isArray(data.forwardedByIds)
      ? data.forwardedByIds.map(String)
      : undefined,
    projectId: data.projectId ? String(data.projectId) : undefined,
    createdAt: data.createdAt as Task['createdAt'],
    updatedAt: data.updatedAt as Task['updatedAt'],
    completedAt: data.completedAt as Task['completedAt'],
    completionNotes: data.completionNotes ? String(data.completionNotes) : undefined,
  }
}

export interface CreateTaskInput {
  title: string
  description: string
  departmentId?: string
  projectId?: string
  assigneeIds: string[]
  priority: Task['priority']
  deadlineAt?: Date
  requiresReview?: boolean
  category?: string
}

export async function validateTaskAssignees(
  actor: AppUser,
  departmentId: string,
  assigneeIds: string[],
): Promise<void> {
  if (!departmentId) {
    throw new Error('Department is required')
  }
  if (assigneeIds.length === 0) {
    throw new Error('Select at least one assignee')
  }
  for (const userId of assigneeIds) {
    const user = await getUserById(userId)
    if (!user) {
      throw new Error('One or more assignees could not be found')
    }
    if (!isEligibleTaskAssignee(user, actor.id)) {
      throw new Error(
        `Cannot assign tasks to ${user.displayName || user.email}.`,
      )
    }
  }
}

export async function createTask(
  actor: AppUser,
  input: CreateTaskInput,
  options?: { files?: File[] },
): Promise<string> {
  if (!canCreateTasks(actor)) {
    throw new Error('You do not have permission to create tasks')
  }
  const departmentId = input.departmentId
  if (!departmentId) {
    throw new Error('Department is required')
  }
  await validateTaskAssignees(actor, departmentId, input.assigneeIds)
  const files = options?.files?.filter((f) => f.size > 0) ?? []
  let attachmentIds: string[] = []
  let attachmentMeta: Task['attachmentMeta']
  if (files.length > 0) {
    const uploaded = await uploadFilesForNewTask(actor.id, files)
    attachmentIds = uploaded.map((u) => u.uploadId)
    attachmentMeta = uploaded.map((u) => ({
      uploadId: u.uploadId,
      objectKey: u.objectKey,
      fileName: u.fileName,
    }))
  }

  const taskRef = doc(collection(db, 'tasks'))
  await setDoc(taskRef, {
    title: input.title,
    description: input.description,
    createdBy: actor.id,
    departmentId: input.departmentId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
    assigneeIds: input.assigneeIds,
    initialAssigneeIds: input.assigneeIds,
    priority: input.priority,
    status: 'todo',
    deadlineAt: input.deadlineAt ?? null,
    requiresReview: input.requiresReview ?? false,
    category: input.category ?? null,
    ...(attachmentIds.length > 0 ? { attachmentIds, attachmentMeta } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const assigneeBatch = writeBatch(db)
  for (const userId of input.assigneeIds) {
    assigneeBatch.set(doc(db, 'tasks', taskRef.id, 'assignees', userId), {
      status: 'todo',
      progress: 0,
      updatedAt: serverTimestamp(),
    })
  }
  await assigneeBatch.commit()

  if (input.projectId) {
    for (const userId of input.assigneeIds) {
      try {
        await ensureProjectParticipant(input.projectId, userId, taskRef.id)
      } catch (err) {
        console.error('project participant link failed', err)
      }
    }
  }

  const created = await getTask(taskRef.id)
  if (created) {
    try {
      await recordTaskHistoryEvent(created.id, {
        kind: 'created',
        actorId: actor.id,
        assignedById: actor.id,
        assigneeIds: input.assigneeIds,
        newAssigneeId: input.assigneeIds[0],
      })
      await postTaskCreatedChatEvents(actor, created, input.assigneeIds)
    } catch (err) {
      console.error('task side effects (history/chat) failed', err)
    }
  }

  return taskRef.id
}

export async function getTask(taskId: string): Promise<Task | null> {
  const snap = await getDoc(doc(db, 'tasks', taskId))
  if (!snap.exists()) return null
  return mapTask(snap.id, snap.data())
}

export function subscribeTask(
  taskId: string,
  onData: (task: Task | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'tasks', taskId), (snap) => {
    if (!snap.exists()) {
      onData(null)
      return
    }
    onData(mapTask(snap.id, snap.data()))
  })
}

export function subscribeMyTasks(userId: string, onData: (tasks: Task[]) => void): Unsubscribe {
  const q = query(tasksCol, where('assigneeIds', 'array-contains', userId))
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => mapTask(d.id, d.data()))
    items.sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
    onData(items)
  })
}

/** Tasks the user forwarded (forward actor), newest first. */
export function subscribeForwardedTasks(
  userId: string,
  onData: (tasks: Task[]) => void,
): Unsubscribe {
  const q = query(tasksCol, where('forwardedByIds', 'array-contains', userId))
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => mapTask(d.id, d.data()))
    items.sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
    onData(items)
  })
}

export function subscribeAllTasks(onData: (tasks: Task[]) => void): Unsubscribe {
  const q = query(tasksCol, orderBy('updatedAt', 'desc'))
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => mapTask(d.id, d.data())))
  })
}

/** Real-time tasks for one or more departments (department admin dashboard / lists). */
export function subscribeDepartmentTasks(
  departmentIds: string[],
  onData: (tasks: Task[]) => void,
): Unsubscribe {
  const ids = [...new Set(departmentIds)].filter(Boolean)
  if (ids.length === 0) {
    onData([])
    return () => undefined
  }

  const chunks: Task[][] = ids.map(() => [])
  const emit = () => onData(mergeTasksByUpdatedAt(chunks))

  const unsubs = ids.map((departmentId, index) => {
    const q = query(tasksCol, where('departmentId', '==', departmentId))
    return onSnapshot(q, (snap) => {
      chunks[index] = snap.docs
        .map((d) => mapTask(d.id, d.data()))
        .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
      emit()
    })
  })

  return () => unsubs.forEach((u) => u())
}

/**
 * Department admin dashboard: tasks in managed departments plus anything currently assigned
 * to the admin (e.g. forwarded from another department). assigneeIds is authoritative for ownership.
 */
export function subscribeAssignedAndDepartmentTasks(
  userId: string,
  departmentIds: string[],
  onData: (tasks: Task[]) => void,
): Unsubscribe {
  let assigned: Task[] = []
  let departmental: Task[] = []
  const emit = () => onData(mergeTasksByUpdatedAt([assigned, departmental]))

  const unsubs: Unsubscribe[] = []
  if (userId) {
    unsubs.push(
      subscribeMyTasks(userId, (items) => {
        assigned = items
        emit()
      }),
    )
  }
  const deptIds = [...new Set(departmentIds)].filter(Boolean)
  if (deptIds.length > 0) {
    unsubs.push(
      subscribeDepartmentTasks(deptIds, (items) => {
        departmental = items
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

/** Department admin Tasks overview: own assignments, created tasks, and managed departments. */
export function subscribeDepartmentAdminOverviewTasks(
  userId: string,
  departmentIds: string[],
  onData: (tasks: Task[]) => void,
): Unsubscribe {
  let assigned: Task[] = []
  let departmental: Task[] = []
  let created: Task[] = []
  const emit = () => onData(mergeTasksByUpdatedAt([assigned, departmental, created]))

  const unsubs: Unsubscribe[] = []
  if (userId) {
    unsubs.push(
      subscribeMyTasks(userId, (items) => {
        assigned = items
        emit()
      }),
    )
    unsubs.push(
      subscribeTasksCreatedBy(userId, (items) => {
        created = items
        emit()
      }),
    )
  }
  const deptIds = [...new Set(departmentIds)].filter(Boolean)
  if (deptIds.length > 0) {
    unsubs.push(
      subscribeDepartmentTasks(deptIds, (items) => {
        departmental = items
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

export function subscribeTasksByProject(
  projectId: string,
  onData: (tasks: Task[]) => void,
): Unsubscribe {
  const q = query(tasksCol, where('projectId', '==', projectId))
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => mapTask(d.id, d.data()))
    items.sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
    onData(items)
  })
}

export function subscribeTasksCreatedBy(
  userId: string,
  onData: (tasks: Task[]) => void,
): Unsubscribe {
  const q = query(tasksCol, where('createdBy', '==', userId), orderBy('updatedAt', 'desc'))
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => mapTask(d.id, d.data())))
  })
}

export async function loadTaskAssignees(taskId: string): Promise<TaskAssignee[]> {
  const snap = await getDocs(collection(db, 'tasks', taskId, 'assignees'))
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      userId: d.id,
      status: (data.status as TaskAssignee['status']) ?? 'todo',
      progress: Number(data.progress ?? 0),
      completedAt: data.completedAt as TaskAssignee['completedAt'],
      completionNotes: data.completionNotes ? String(data.completionNotes) : undefined,
      updatedAt: data.updatedAt as TaskAssignee['updatedAt'],
    }
  })
}

export function subscribeTaskAssignees(
  taskId: string,
  onData: (assignees: TaskAssignee[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'tasks', taskId, 'assignees'), (snap) => {
    onData(
      snap.docs.map((d) => {
        const data = d.data()
        return {
          userId: d.id,
          status: (data.status as TaskAssignee['status']) ?? 'todo',
          progress: Number(data.progress ?? 0),
          completedAt: data.completedAt as TaskAssignee['completedAt'],
          completionNotes: data.completionNotes ? String(data.completionNotes) : undefined,
          updatedAt: data.updatedAt as TaskAssignee['updatedAt'],
        }
      }),
    )
  })
}

export function isTaskDueToday(task: Task): boolean {
  if (!task.deadlineAt) return false
  const d = task.deadlineAt.toDate()
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function isTaskPending(task: Task): boolean {
  return task.status !== 'completed' && task.status !== 'cancelled'
}

export async function updateTaskStatus(
  actor: AppUser,
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  const task = await getTask(taskId)
  if (!task || !canAccessTask(actor, task)) {
    throw new Error('Task not found or access denied')
  }
  await updateDoc(doc(db, 'tasks', taskId), {
    status,
    updatedAt: serverTimestamp(),
    ...(status === 'completed' ? { completedAt: serverTimestamp() } : {}),
  })
}

export async function updateAssigneeProgress(
  actor: AppUser,
  taskId: string,
  progress: number,
  status: TaskAssignee['status'],
  completionNotes?: string,
): Promise<void> {
  const task = await getTask(taskId)
  if (!task || !task.assigneeIds.includes(actor.id)) {
    throw new Error('You are not assigned to this task')
  }
  await updateDoc(doc(db, 'tasks', taskId, 'assignees', actor.id), {
    progress,
    status,
    completionNotes: completionNotes ?? null,
    updatedAt: serverTimestamp(),
    ...(status === 'completed' ? { completedAt: serverTimestamp() } : {}),
  })

  const assigneesSnap = await getDocs(collection(db, 'tasks', taskId, 'assignees'))
  const allCompleted = assigneesSnap.docs.every((d) => d.data().status === 'completed')
  if (allCompleted && task.requiresReview) {
    await updateDoc(doc(db, 'tasks', taskId), {
      status: 'completed',
      updatedAt: serverTimestamp(),
      completedAt: serverTimestamp(),
    })
  } else if (allCompleted && !task.requiresReview) {
    await updateDoc(doc(db, 'tasks', taskId), {
      status: 'completed',
      updatedAt: serverTimestamp(),
      completedAt: serverTimestamp(),
    })
  } else if (status === 'in_progress') {
    await updateDoc(doc(db, 'tasks', taskId), {
      status: 'in_progress',
      updatedAt: serverTimestamp(),
    })
  }

  if (status === 'completed') {
    const refreshed = await getTask(taskId)
    if (refreshed) {
      await notifyTaskAssigneeCompleted(actor, refreshed)
      try {
        await recordTaskHistoryEvent(taskId, {
          kind: 'completed',
          actorId: actor.id,
        })
      } catch (err) {
        console.error('task completion history failed', err)
      }
    }
  }
}

export function subscribeMyAssigneeState(
  taskId: string,
  userId: string,
  onData: (state: TaskAssignee | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'tasks', taskId, 'assignees', userId), (snap) => {
    if (!snap.exists()) {
      onData(null)
      return
    }
    const data = snap.data()
    onData({
      userId,
      status: (data.status as TaskAssignee['status']) ?? 'todo',
      progress: Number(data.progress ?? 0),
      completedAt: data.completedAt as TaskAssignee['completedAt'],
      completionNotes: data.completionNotes ? String(data.completionNotes) : undefined,
      updatedAt: data.updatedAt as TaskAssignee['updatedAt'],
    })
  })
}

export async function addTaskComment(
  actor: AppUser,
  taskId: string,
  text: string,
): Promise<void> {
  const task = await getTask(taskId)
  if (!task || !canAccessTask(actor, task)) {
    throw new Error('Cannot comment on this task')
  }
  await addDoc(collection(db, 'tasks', taskId, 'comments'), {
    authorId: actor.id,
    text,
    createdAt: serverTimestamp(),
  })
}

export function subscribeTaskComments(
  taskId: string,
  onData: (comments: TaskComment[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'tasks', taskId, 'comments'),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    onData(
      snap.docs.map((d) => ({
        id: d.id,
        authorId: String(d.data().authorId),
        text: String(d.data().text ?? ''),
        attachmentIds: d.data().attachmentIds as string[] | undefined,
        createdAt: d.data().createdAt as TaskComment['createdAt'],
      })),
    )
  })
}

export async function recordTaskHistoryEvent(
  taskId: string,
  event: Omit<TaskHistoryEvent, 'id' | 'taskId' | 'createdAt'> & { id?: string },
): Promise<void> {
  const eventId =
    event.id ??
    (event.kind === 'created'
      ? 'created'
      : event.kind === 'completed'
        ? `completed-${event.actorId}`
        : `forward-${event.actorId}-${event.newAssigneeId}-${event.previousAssigneeId}`)
  const ref = doc(db, 'tasks', taskId, 'history', eventId)
  const existing = await getDoc(ref)
  if (existing.exists()) return
  await setDoc(ref, {
    taskId,
    kind: event.kind,
    actorId: event.actorId,
    assignedById: event.assignedById ?? null,
    previousAssigneeId: event.previousAssigneeId ?? null,
    newAssigneeId: event.newAssigneeId ?? null,
    handoverNote: event.handoverNote ?? null,
    assigneeIds: event.assigneeIds ?? null,
    createdAt: serverTimestamp(),
  })
}

export function subscribeTaskHistory(
  taskId: string,
  onData: (events: TaskHistoryEvent[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'tasks', taskId, 'history'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snap) => {
    onData(
      snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          taskId,
          kind: data.kind as TaskHistoryEvent['kind'],
          actorId: String(data.actorId),
          assignedById: data.assignedById ? String(data.assignedById) : undefined,
          previousAssigneeId: data.previousAssigneeId
            ? String(data.previousAssigneeId)
            : undefined,
          newAssigneeId: data.newAssigneeId ? String(data.newAssigneeId) : undefined,
          handoverNote: data.handoverNote ? String(data.handoverNote) : undefined,
          assigneeIds: Array.isArray(data.assigneeIds)
            ? data.assigneeIds.map(String)
            : undefined,
          createdAt: data.createdAt as TaskHistoryEvent['createdAt'],
        }
      }),
    )
  })
}

export async function forwardTask(
  actor: AppUser,
  taskId: string,
  newAssigneeId: string,
  handoverNoteRaw: string,
  idempotencyKey: string,
): Promise<void> {
  const handoverNote = validateHandoverNote(handoverNoteRaw)
  const newUser = await getUserById(newAssigneeId)
  if (!newUser) throw new Error('Recipient not found')

  let alreadyHandled = false
  try {
  await runTransaction(db, async (tx) => {
    const taskRef = doc(db, 'tasks', taskId)
    const taskSnap = await tx.get(taskRef)
    if (!taskSnap.exists()) throw new Error('Task not found')
    const task = mapTask(taskSnap.id, taskSnap.data())

    const historyRef = doc(db, 'tasks', taskId, 'history', `forward-${idempotencyKey}`)
    const historySnap = await tx.get(historyRef)
    if (historySnap.exists()) {
      alreadyHandled = true
      return
    }

    if (!canForwardTask(actor, task)) {
      throw new Error('This task cannot be forwarded')
    }
    if (!task.departmentId) throw new Error('Task department is missing')
    if (!isEligibleForwardRecipient(newUser, actor.id)) {
      throw new Error('Selected user cannot receive this task')
    }

    const nextAssigneeIds = buildHandoverAssigneeIds(
      task.assigneeIds,
      actor.id,
      newAssigneeId,
    )

    const former = Array.from(new Set([...(task.formerAssigneeIds ?? []), actor.id]))
    const forwardedBy = Array.from(new Set([...(task.forwardedByIds ?? []), actor.id]))

    // Order matters for security rules: finish forwarder's assignee row while still on assigneeIds,
    // then update task ownership, then create the recipient assignee row.
    tx.set(
      doc(db, 'tasks', taskId, 'assignees', actor.id),
      {
        status: 'completed',
        progress: 100,
        completionNotes: handoverNote,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    tx.update(taskRef, {
      assigneeIds: nextAssigneeIds,
      formerAssigneeIds: former,
      forwardedByIds: forwardedBy,
      status: task.status === 'todo' ? 'in_progress' : task.status,
      updatedAt: serverTimestamp(),
    })

    tx.set(doc(db, 'tasks', taskId, 'assignees', newAssigneeId), {
      status: 'todo',
      progress: 0,
      updatedAt: serverTimestamp(),
    })

    tx.set(historyRef, {
      taskId,
      kind: 'forwarded',
      actorId: actor.id,
      assignedById: task.createdBy,
      previousAssigneeId: actor.id,
      newAssigneeId,
      handoverNote,
      assigneeIds: nextAssigneeIds,
      createdAt: serverTimestamp(),
    })
  })
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : ''
    if (code === 'permission-denied') {
      throw new Error(
        'Handover was blocked by security rules. Deploy the latest firestore.rules, then try again.',
      )
    }
    throw err instanceof Error ? err : new Error('Handover failed')
  }

  if (alreadyHandled) return

  const refreshed = await getTask(taskId)
  if (!refreshed) return

  if (refreshed.projectId) {
    try {
      await ensureProjectParticipant(refreshed.projectId, newAssigneeId, taskId)
    } catch (err) {
      console.error('project participant link failed', err)
    }
  }

  try {
    await notifyTaskHandover(actor, refreshed, newAssigneeId, handoverNote, idempotencyKey)
  } catch (err) {
    console.error('handover notification failed', err)
  }
  try {
    await postTaskHandoverChatEvents(actor, refreshed, newAssigneeId, handoverNote, idempotencyKey)
  } catch (err) {
    console.error('handover chat event failed', err)
  }
}

async function deleteTaskSubcollection(taskId: string, name: string): Promise<void> {
  const snap = await getDocs(collection(db, 'tasks', taskId, name))
  if (snap.empty) return
  let batch = writeBatch(db)
  let ops = 0
  for (const d of snap.docs) {
    batch.delete(d.ref)
    ops += 1
    if (ops >= 450) {
      await batch.commit()
      batch = writeBatch(db)
      ops = 0
    }
  }
  if (ops > 0) await batch.commit()
}

export async function deleteTask(actor: AppUser, taskId: string): Promise<void> {
  const task = await getTask(taskId)
  if (!task) throw new Error('Task not found')
  if (!canDeleteTask(actor, task)) {
    throw new Error('You do not have permission to delete this task')
  }
  for (const sub of ['assignees', 'history', 'comments'] as const) {
    await deleteTaskSubcollection(taskId, sub)
  }
  await deleteDoc(doc(db, 'tasks', taskId))
}

export function isTaskOverdue(task: Task): boolean {
  if (!task.deadlineAt || task.status === 'completed' || task.status === 'cancelled') {
    return false
  }
  const deadline = task.deadlineAt.toDate()
  return deadline.getTime() < Date.now()
}
