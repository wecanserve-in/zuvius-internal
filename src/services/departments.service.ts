import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { AppUser, Department } from '@/types'
import { canManageDepartments, hasMinRole } from '@/lib/permissions'
import {
  provisionDepartmentChannel,
  refreshDepartmentChannelRoster,
  syncDepartmentChannelTitle,
} from '@/services/conversations.service'

const departmentsCol = collection(db, 'departments')
const conversationsCol = collection(db, 'conversations')

/** Member UIDs from the department group chat (works when user list queries are restricted). */
export async function getDepartmentChannelMemberIds(departmentId: string): Promise<string[]> {
  const q = query(
    conversationsCol,
    where('isDepartmentChannel', '==', true),
    where('departmentId', '==', departmentId),
  )
  const snap = await getDocs(q)
  if (snap.empty) return []
  const memberIds = snap.docs[0].data().memberIds
  return Array.isArray(memberIds) ? memberIds.map(String) : []
}

function mapDepartment(id: string, data: Record<string, unknown>): Department {
  return {
    id,
    name: String(data.name ?? ''),
    description: data.description ? String(data.description) : undefined,
    adminIds: Array.isArray(data.adminIds) ? data.adminIds.map(String) : [],
    memberIds: Array.isArray(data.memberIds) ? data.memberIds.map(String) : [],
    createdAt: data.createdAt as Department['createdAt'],
    updatedAt: data.updatedAt as Department['updatedAt'],
  }
}

export function subscribeDepartments(onData: (departments: Department[]) => void): Unsubscribe {
  const q = query(departmentsCol, orderBy('name', 'asc'))
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => mapDepartment(d.id, d.data())))
  })
}

export async function listDepartments(): Promise<Department[]> {
  const q = query(departmentsCol, orderBy('name', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapDepartment(d.id, d.data()))
}

function placeholderDepartment(id: string): Department {
  return {
    id,
    name: 'Department',
    adminIds: [],
    memberIds: [],
  }
}

/** Merge readable department docs + profile departmentIds (when full list is not visible). */
export function mergeManagedDepartments(
  user: AppUser,
  readable: Department[],
): Department[] {
  if (!user.isActive) return []
  if (hasMinRole(user, 'admin')) return readable
  if (user.role !== 'department_admin') return []

  const byId = new Map<string, Department>()
  for (const d of readable) {
    if (user.departmentIds.includes(d.id) || d.adminIds.includes(user.id)) {
      byId.set(d.id, d)
    }
  }
  for (const id of user.departmentIds) {
    if (!byId.has(id)) byId.set(id, placeholderDepartment(id))
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** @deprecated use mergeManagedDepartments */
export function departmentsManagedBy(user: AppUser, all: Department[]): Department[] {
  return mergeManagedDepartments(user, all)
}

/**
 * Real-time departments a department admin manages:
 * - docs they can read from the org list
 * - docs where they appear in adminIds (targeted query)
 * - ids on their profile even if the doc is not readable yet
 */
export function subscribeManagedDepartments(
  user: AppUser | null,
  onData: (departments: Department[]) => void,
): Unsubscribe {
  if (!user?.isActive) {
    onData([])
    return () => undefined
  }
  if (hasMinRole(user, 'admin')) {
    return subscribeDepartments(onData)
  }
  if (user.role !== 'department_admin') {
    onData([])
    return () => undefined
  }

  const merged = new Map<string, Department>()
  const profileHydrateStarted = new Set<string>()

  const emit = () => {
    for (const id of user.departmentIds) {
      if (!merged.has(id) && !profileHydrateStarted.has(id)) {
        profileHydrateStarted.add(id)
        void getDoc(doc(departmentsCol, id)).then((snap) => {
          if (snap.exists()) {
            merged.set(id, mapDepartment(snap.id, snap.data()))
          } else {
            merged.set(id, placeholderDepartment(id))
          }
          emit()
        })
      }
      if (!merged.has(id)) merged.set(id, placeholderDepartment(id))
    }
    onData(mergeManagedDepartments(user, [...merged.values()]))
  }

  const unsubAll = onSnapshot(query(departmentsCol, orderBy('name', 'asc')), (snap) => {
    for (const d of snap.docs) {
      merged.set(d.id, mapDepartment(d.id, d.data()))
    }
    emit()
  })

  const unsubAdmin = onSnapshot(
    query(departmentsCol, where('adminIds', 'array-contains', user.id)),
    (snap) => {
      for (const d of snap.docs) {
        merged.set(d.id, mapDepartment(d.id, d.data()))
      }
      emit()
    },
  )

  return () => {
    unsubAll()
    unsubAdmin()
  }
}

export async function listManagedDepartments(user: AppUser): Promise<Department[]> {
  if (!user.isActive) return []
  if (hasMinRole(user, 'admin')) return listDepartments()

  const merged = new Map<string, Department>()
  const readable = await getDocs(query(departmentsCol, orderBy('name', 'asc')))
  for (const d of readable.docs) {
    merged.set(d.id, mapDepartment(d.id, d.data()))
  }
  const asAdmin = await getDocs(
    query(departmentsCol, where('adminIds', 'array-contains', user.id)),
  )
  for (const d of asAdmin.docs) {
    merged.set(d.id, mapDepartment(d.id, d.data()))
  }
  return mergeManagedDepartments(user, [...merged.values()])
}

/** Active department admins from adminIds and users with department_admin + departmentIds. */
export function resolveDepartmentAdmins(department: Department, users: AppUser[]): AppUser[] {
  const byId = new Map<string, AppUser>()
  for (const id of department.adminIds) {
    const u = users.find((x) => x.id === id)
    if (u?.isActive) byId.set(u.id, u)
  }
  for (const u of users) {
    if (
      u.isActive &&
      u.role === 'department_admin' &&
      u.departmentIds.includes(department.id)
    ) {
      byId.set(u.id, u)
    }
  }
  return [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/** Writes adminIds on department docs when profiles list admins but adminIds is empty or stale. */
export async function reconcileDepartmentAdminIds(
  actor: AppUser,
  departments: Department[],
  users: AppUser[],
): Promise<void> {
  if (!canManageDepartments(actor)) return
  for (const d of departments) {
    const resolvedIds = resolveDepartmentAdmins(d, users).map((u) => u.id)
    const current = [...d.adminIds].sort().join(',')
    const next = [...resolvedIds].sort().join(',')
    if (current === next) continue
    await updateDoc(doc(db, 'departments', d.id), {
      adminIds: resolvedIds,
      updatedAt: serverTimestamp(),
    })
  }
}

/** Keeps department.memberIds in sync for directory / forwarding (admin-only write). */
export async function indexUserOnDepartments(userId: string, departmentIds: string[]): Promise<void> {
  for (const departmentId of departmentIds) {
    if (!departmentId) continue
    const ref = doc(departmentsCol, departmentId)
    const snap = await getDoc(ref)
    if (!snap.exists()) continue
    const memberIds = Array.isArray(snap.data().memberIds)
      ? snap.data().memberIds.map(String)
      : []
    if (memberIds.includes(userId)) continue
    await updateDoc(ref, {
      memberIds: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    })
  }
}

export async function addDepartmentAdmin(
  actor: AppUser,
  departmentId: string,
  userId: string,
): Promise<void> {
  if (!canManageDepartments(actor)) {
    throw new Error('You do not have permission to update department admins')
  }
  const ref = doc(db, 'departments', departmentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Department not found')
  const data = snap.data()
  const adminIds = Array.isArray(data.adminIds) ? data.adminIds.map(String) : []
  if (adminIds.includes(userId)) return
  await updateDoc(ref, {
    adminIds: [...adminIds, userId],
    updatedAt: serverTimestamp(),
  })
}

export async function removeDepartmentAdmin(
  actor: AppUser,
  departmentId: string,
  userId: string,
): Promise<void> {
  if (!canManageDepartments(actor)) return
  const ref = doc(db, 'departments', departmentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const adminIds = Array.isArray(snap.data().adminIds)
    ? snap.data().adminIds.map(String)
    : []
  if (!adminIds.includes(userId)) return
  await updateDoc(ref, {
    adminIds: adminIds.filter((id: string) => id !== userId),
    updatedAt: serverTimestamp(),
  })
}

export async function removeUserFromDepartmentRoster(
  actor: AppUser,
  departmentId: string,
  userId: string,
): Promise<void> {
  if (!canManageDepartments(actor)) {
    throw new Error('You do not have permission to update department rosters')
  }
  const ref = doc(departmentsCol, departmentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const memberIds = Array.isArray(snap.data().memberIds)
    ? snap.data().memberIds.map(String)
    : []
  if (!memberIds.includes(userId)) return
  await updateDoc(ref, {
    memberIds: memberIds.filter((id: string) => id !== userId),
    updatedAt: serverTimestamp(),
  })
}

export async function getDepartment(departmentId: string): Promise<Department | null> {
  const snap = await getDocs(query(departmentsCol))
  const found = snap.docs.find((d) => d.id === departmentId)
  if (!found) return null
  return mapDepartment(found.id, found.data())
}

export async function createDepartmentRecord(
  actor: AppUser,
  input: { name: string; description?: string },
): Promise<string> {
  if (!canManageDepartments(actor)) {
    throw new Error('You do not have permission to create departments')
  }
  const name = input.name.trim()
  if (name.length < 2) {
    throw new Error('Department name is required')
  }
  const ref = await addDoc(departmentsCol, {
    name,
    description: input.description?.trim() ?? null,
    adminIds: [],
    memberIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  try {
    await provisionDepartmentChannel(actor, { id: ref.id, name })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not create department chat'
    if (/permission/i.test(msg)) {
      throw new Error(
        'Department was created, but the group chat could not be set up. Deploy updated firestore rules, then use Open chat on the department row.',
      )
    }
    throw err
  }
  return ref.id
}

export async function updateDepartmentRecord(
  actor: AppUser,
  departmentId: string,
  input: { name?: string; description?: string },
): Promise<void> {
  if (!canManageDepartments(actor)) {
    throw new Error('You do not have permission to update departments')
  }
  const name = input.name?.trim()
  if (name !== undefined && name.length < 2) {
    throw new Error('Department name is required')
  }
  await updateDoc(doc(db, 'departments', departmentId), {
    ...(name !== undefined ? { name } : {}),
    ...(input.description !== undefined
      ? { description: input.description.trim() || null }
      : {}),
    updatedAt: serverTimestamp(),
  })
  if (name) {
    await syncDepartmentChannelTitle(actor, departmentId, name)
    await refreshDepartmentChannelRoster(actor, departmentId, name)
  }
}
