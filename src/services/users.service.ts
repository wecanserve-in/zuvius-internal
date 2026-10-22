import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db, firebaseConfig } from '@/lib/firebase/config'
import { canChangeRole, canManageUsers, hasMinRole } from '@/lib/permissions'
import {
  isEligibleForwardRecipient,
  isEligibleTaskAssignee,
} from '@/lib/permissions/forwarding'
import {
  refreshDepartmentChannelRoster,
  syncUserDepartmentChannels,
} from '@/services/conversations.service'
import {
  addDepartmentAdmin,
  getDepartmentChannelMemberIds,
  indexUserOnDepartments,
  listDepartments,
  removeDepartmentAdmin,
  removeUserFromDepartmentRoster,
} from '@/services/departments.service'
import type { AppUser, UserRole } from '@/types'

const usersCol = collection(db, 'users')
const conversationsCol = collection(db, 'conversations')

function mapUser(id: string, data: Record<string, unknown>): AppUser {
  return {
    id,
    displayName: String(data.displayName ?? ''),
    email: String(data.email ?? ''),
    photoURL: data.photoURL ? String(data.photoURL) : undefined,
    photoUploadId: data.photoUploadId ? String(data.photoUploadId) : undefined,
    photoObjectKey: data.photoObjectKey ? String(data.photoObjectKey) : undefined,
    departmentIds: Array.isArray(data.departmentIds) ? data.departmentIds.map(String) : [],
    role: (data.role as AppUser['role']) ?? 'member',
    isActive: data.isActive !== false,
    phone: data.phone ? String(data.phone) : undefined,
    fcmTokens: Array.isArray(data.fcmTokens) ? data.fcmTokens.map(String) : undefined,
    createdAt: data.createdAt as AppUser['createdAt'],
    updatedAt: data.updatedAt as AppUser['updatedAt'],
  }
}

export async function getUserById(userId: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return null
  return mapUser(snap.id, snap.data())
}

/** Loads profiles by id (works when a full user list query is not allowed). */
export async function loadUsersByIds(
  userIds: string[],
  existing: Map<string, AppUser> = new Map(),
): Promise<Map<string, AppUser>> {
  const next = new Map(existing)
  const missing = [...new Set(userIds)].filter((id) => !next.has(id))
  await Promise.all(
    missing.map(async (id) => {
      try {
        const user = await getUserById(id)
        if (user) next.set(id, user)
      } catch {
        // Profile not readable for this actor (e.g. cross-department).
      }
    }),
  )
  return next
}

export function subscribeUser(
  userId: string,
  onData: (user: AppUser | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', userId),
    (snap) => {
      if (!snap.exists()) {
        onData(null)
        return
      }
      onData(mapUser(snap.id, snap.data()))
    },
    (err) => onError?.(err),
  )
}

export async function listActiveUsers(): Promise<AppUser[]> {
  try {
    const q = query(usersCol, where('isActive', '==', true))
    const snap = await getDocs(q)
    const fromQuery = snap.docs.map((d) => mapUser(d.id, d.data()))
    if (fromQuery.length > 0) return fromQuery
  } catch {
    // Query may fail without an index; fall back to full list + client filter.
  }
  const snap = await getDocs(usersCol)
  return snap.docs
    .map((d) => mapUser(d.id, d.data()))
    .filter((u) => u.isActive)
}

/** Everyone an employee can start a 1:1 with (company directory). */
export async function listUsersForMessaging(): Promise<AppUser[]> {
  try {
    return await listActiveUsers()
  } catch {
    return []
  }
}

function sortByDisplayName(users: AppUser[]): AppUser[] {
  return [...users].sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/** Collect user IDs from department docs, channels, and per-dept profile queries (no org-wide user list). */
export async function collectOrgDirectoryUserIds(actorId: string): Promise<string[]> {
  const ids = new Set<string>()
  const depts = await listDepartments()

  for (const dept of depts) {
    for (const uid of dept.memberIds) ids.add(uid)
    for (const uid of dept.adminIds) ids.add(uid)
    try {
      const channelIds = await getDepartmentChannelMemberIds(dept.id)
      for (const uid of channelIds) ids.add(uid)
    } catch {
      // Channel may not exist.
    }
    try {
      const q = query(usersCol, where('departmentIds', 'array-contains', dept.id))
      const snap = await getDocs(q)
      for (const d of snap.docs) ids.add(d.id)
    } catch {
      try {
        const users = await listUsersByDepartment(dept.id)
        for (const u of users) ids.add(u.id)
      } catch {
        // Skip department if user query is denied.
      }
    }
  }

  if (actorId) {
    try {
      const inbox = await getDocs(
        query(conversationsCol, where('memberIds', 'array-contains', actorId)),
      )
      for (const d of inbox.docs) {
        const mids = d.data().memberIds
        if (!Array.isArray(mids)) continue
        for (const uid of mids) ids.add(String(uid))
      }
    } catch {
      // Inbox not readable.
    }
  }

  return [...ids]
}

async function mergeUsersFromDepartmentQuery(
  deptId: string,
  actor: AppUser,
  byId: Map<string, AppUser>,
  eligible: (candidate: AppUser, actorId: string) => boolean,
): Promise<void> {
  const snap = await getDocs(
    query(usersCol, where('departmentIds', 'array-contains', deptId)),
  )
  for (const docSnap of snap.docs) {
    const u = mapUser(docSnap.id, docSnap.data())
    if (eligible(u, actor.id)) byId.set(u.id, u)
  }
}

async function collectOrgColleagues(
  actor: AppUser,
  options?: { taskDepartmentId?: string },
  eligible: (candidate: AppUser, actorId: string) => boolean = isEligibleTaskAssignee,
): Promise<AppUser[]> {
  const byId = new Map<string, AppUser>()
  const depts = await listDepartments()
  const deptIds = new Set<string>(depts.map((d) => d.id))
  for (const id of actor.departmentIds) deptIds.add(id)
  if (options?.taskDepartmentId) deptIds.add(options.taskDepartmentId)

  const members = await listMembersForDepartmentIds([...deptIds])
  for (const u of members) {
    if (eligible(u, actor.id)) byId.set(u.id, u)
  }

  for (const deptId of deptIds) {
    try {
      await mergeUsersFromDepartmentQuery(deptId, actor, byId, eligible)
    } catch {
      // Query may fail until firestore list rules are deployed; memberIds/channel fallbacks above.
    }
  }

  const assignmentPicker = eligible === isEligibleTaskAssignee

  if (assignmentPicker) {
    // Any active employee may assign org-wide; rules allow listing active users.
    try {
      const listed = await listActiveUsers()
      for (const u of listed) {
        if (eligible(u, actor.id)) byId.set(u.id, u)
      }
    } catch {
      // Fall through to department / directory fallbacks.
    }
  } else if (hasMinRole(actor, 'admin')) {
    try {
      const listed = await listActiveUsers()
      for (const u of listed) {
        if (eligible(u, actor.id)) byId.set(u.id, u)
      }
    } catch {
      // optional org-wide list
    }
  }

  if (byId.size === 0) {
    const ids = await collectOrgDirectoryUserIds(actor.id)
    await loadUsersByIds(ids, byId)
    for (const [id, u] of [...byId.entries()]) {
      if (!eligible(u, actor.id)) byId.delete(id)
    }
  }

  return sortByDisplayName([...byId.values()])
}

/** Organisation-wide colleagues for task create and assignment (includes Super Admin). */
export async function listOrgTaskMemberCandidates(
  actor: AppUser,
  options?: { taskDepartmentId?: string },
): Promise<AppUser[]> {
  const users = await collectOrgColleagues(actor, options, isEligibleTaskAssignee)
  if (users.length > 0) return users
  throw new Error(
    'Unable to load colleagues for assignment. Ask an admin to open Team (syncs department rosters) or try again after signing out and back in.',
  )
}

/**
 * Organisation-wide colleagues for task forwarding.
 * Uses department profile queries first (full user docs in one request), then memberIds/getDoc fallbacks.
 */
export async function listForwardRecipientCandidates(
  actor: AppUser,
  options?: { taskDepartmentId?: string },
): Promise<AppUser[]> {
  const users = await collectOrgColleagues(actor, options, isEligibleForwardRecipient)
  if (users.length > 0) return users
  throw new Error(
    'Unable to load colleagues for forwarding. Ask an admin to open Team (syncs department rosters) or try again after signing out and back in.',
  )
}

/** Admin: rebuild each department's memberIds from user profiles (fixes forward list when queries are restricted). */
export async function syncDepartmentRostersForAdmin(actor: AppUser): Promise<void> {
  if (!hasMinRole(actor, 'admin')) return
  const depts = await listDepartments()
  for (const dept of depts) {
    const snap = await getDocs(
      query(usersCol, where('departmentIds', 'array-contains', dept.id)),
    )
    const memberIds = snap.docs.map((d) => d.id)
    await updateDoc(doc(db, 'departments', dept.id), {
      memberIds,
      updatedAt: serverTimestamp(),
    })
  }
}

export async function listUsersByDepartment(departmentId: string): Promise<AppUser[]> {
  try {
    const q = query(usersCol, where('departmentIds', 'array-contains', departmentId))
    const snap = await getDocs(q)
    return snap.docs.map((d) => mapUser(d.id, d.data())).filter((u) => u.isActive)
  } catch {
    return []
  }
}

/** Active members for one or more department document IDs (Sales, etc.). */
export async function listMembersForDepartmentIds(departmentIds: string[]): Promise<AppUser[]> {
  const ids = [...new Set(departmentIds)].filter(Boolean)
  const byId = new Map<string, AppUser>()
  for (const deptId of ids) {
    try {
      const users = await listUsersByDepartment(deptId)
      for (const u of users) byId.set(u.id, u)
    } catch {
      // Collection query may be denied for department admins (rules / profile departmentIds).
    }

    try {
      const deptSnap = await getDoc(doc(db, 'departments', deptId))
      if (deptSnap.exists()) {
        const raw = deptSnap.data().memberIds
        const memberIds = Array.isArray(raw) ? raw.map(String) : []
        if (memberIds.length > 0) {
          await loadUsersByIds(memberIds, byId)
        }
      }
    } catch {
      // Department doc may not be readable yet.
    }

    try {
      const channelMemberIds = await getDepartmentChannelMemberIds(deptId)
      await loadUsersByIds(channelMemberIds, byId)
    } catch {
      // Department channel may not exist yet.
    }
  }
  return [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/** Active users in departments (query per dept + optional memberIds on department docs). */
export async function listMembersForDepartments(
  departments: { id: string; memberIds: string[] }[],
): Promise<AppUser[]> {
  const byId = new Map<string, AppUser>()
  const fromIds = await listMembersForDepartmentIds(departments.map((d) => d.id))
  for (const u of fromIds) byId.set(u.id, u)

  for (const dept of departments) {
    for (const uid of dept.memberIds) {
      if (byId.has(uid)) continue
      const user = await getUserById(uid)
      if (user?.isActive) byId.set(uid, user)
    }
  }
  return [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export interface CreateUserProfileInput {
  authUid: string
  email: string
  displayName: string
  role: UserRole
  departmentIds: string[]
}

/** After creating the Auth user in Firebase Console, link their UID to a Firestore profile. */
export async function createUserProfile(
  actor: AppUser,
  input: CreateUserProfileInput,
): Promise<void> {
  if (!canManageUsers(actor)) {
    throw new Error('You do not have permission to create users')
  }
  if (!canChangeRole(actor, input.role)) {
    throw new Error('You cannot assign this role')
  }
  if (!input.departmentIds?.length) {
    throw new Error('Department is required')
  }
  const uid = input.authUid.trim()
  if (uid.length < 10) {
    throw new Error('Paste the full Authentication UID')
  }
  await setDoc(doc(db, 'users', uid), {
    email: input.email.trim(),
    displayName: input.displayName.trim(),
    role: input.role,
    departmentIds: input.departmentIds,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  try {
    await indexUserOnDepartments(uid, input.departmentIds)
  } catch {
    // Directory still works via user.departmentIds queries.
  }
}

export interface CreateEmployeeInput {
  email: string
  password: string
  displayName: string
  role: UserRole
  departmentIds: string[]
}

/** Creates Firebase Auth user + Firestore profile in one step (admin stays signed in). */
export async function createEmployeeComplete(
  actor: AppUser,
  input: CreateEmployeeInput,
): Promise<string> {
  if (!canManageUsers(actor)) {
    throw new Error('You do not have permission to create employees')
  }
  if (!canChangeRole(actor, input.role)) {
    throw new Error('You cannot assign this role')
  }
  if (!input.departmentIds?.length) {
    throw new Error('Department is required')
  }

  const email = input.email.trim()
  const password = input.password
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters')
  }

  let secondaryApp: FirebaseApp | undefined
  try {
    secondaryApp = initializeApp(firebaseConfig, `employee-create-${Date.now()}`)
    const secondaryAuth = getAuth(secondaryApp)
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    const uid = credential.user.uid
    await signOut(secondaryAuth)

    await createUserProfile(actor, {
      authUid: uid,
      email,
      displayName: input.displayName,
      role: input.role,
      departmentIds: input.departmentIds,
    })

    if (input.role === 'department_admin') {
      for (const departmentId of input.departmentIds) {
        await addDepartmentAdmin(actor, departmentId, uid)
      }
    }

    return uid
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : ''
    if (code === 'auth/email-already-in-use') {
      throw new Error('This email already exists in Authentication. Use a different email.')
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error('Email/password sign-up is disabled. Enable it in Firebase Authentication.')
    }
    if (code === 'auth/weak-password') {
      throw new Error('Password is too weak. Use at least 6 characters.')
    }
    throw err instanceof Error ? err : new Error('Failed to create employee')
  } finally {
    if (secondaryApp) {
      await deleteApp(secondaryApp).catch(() => undefined)
    }
  }
}

export interface UpdateEmployeeProfileInput {
  role: UserRole
  departmentIds: string[]
}

/** Admin updates a colleague's role and department assignment. */
export async function updateEmployeeProfile(
  actor: AppUser,
  targetUserId: string,
  input: UpdateEmployeeProfileInput,
): Promise<void> {
  if (!canManageUsers(actor)) {
    throw new Error('You do not have permission to update employees')
  }
  const target = await getUserById(targetUserId)
  if (!target) {
    throw new Error('Employee not found')
  }
  if (actor.id === targetUserId) {
    throw new Error('Use Settings to update your own profile')
  }
  if (target.role === 'super_admin' && actor.role !== 'super_admin') {
    throw new Error('Only super admins can edit super admin accounts')
  }
  if (!canChangeRole(actor, input.role)) {
    throw new Error('You cannot assign this role')
  }
  if (!input.departmentIds?.length) {
    throw new Error('Department is required')
  }

  const prevDeptIds = [...target.departmentIds]
  const nextDeptIds = [...input.departmentIds]
  const prevRole = target.role
  const nextRole = input.role

  await updateDoc(doc(db, 'users', targetUserId), {
    role: nextRole,
    departmentIds: nextDeptIds,
    updatedAt: serverTimestamp(),
  })

  const removedDepts = prevDeptIds.filter((id) => !nextDeptIds.includes(id))
  const addedDepts = nextDeptIds.filter((id) => !prevDeptIds.includes(id))

  for (const departmentId of removedDepts) {
    await removeUserFromDepartmentRoster(actor, departmentId, targetUserId)
  }
  await indexUserOnDepartments(targetUserId, nextDeptIds)

  if (prevRole === 'department_admin') {
    for (const departmentId of prevDeptIds) {
      await removeDepartmentAdmin(actor, departmentId, targetUserId)
    }
  }
  if (nextRole === 'department_admin') {
    for (const departmentId of nextDeptIds) {
      await addDepartmentAdmin(actor, departmentId, targetUserId)
    }
  }

  const departments = await listDepartments()
  const names = new Map(departments.map((d) => [d.id, d.name]))
  await syncUserDepartmentChannels(actor, nextDeptIds, names)
  for (const departmentId of [...removedDepts, ...addedDepts]) {
    await refreshDepartmentChannelRoster(actor, departmentId, names.get(departmentId))
  }
}

export async function setProfilePhotoUploadId(
  userId: string,
  uploadId: string,
  objectKey: string,
  fileUrl?: string,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    photoUploadId: uploadId,
    photoObjectKey: objectKey,
    ...(fileUrl ? { photoURL: fileUrl } : {}),
    updatedAt: serverTimestamp(),
  })
}
