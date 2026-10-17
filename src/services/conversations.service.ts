import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import {
  canAccessConversation,
  canManageDepartmentChat,
  canManageUsers,
  hasMinRole,
} from '@/lib/permissions'
import { notifyConversationMessage } from '@/services/messageNotifications.service'
import { listUsersByDepartment, listActiveUsers } from '@/services/users.service'
import type { AppUser, ChatMessage, Conversation, Department } from '@/types'

const conversationsCol = collection(db, 'conversations')

export function departmentGroupTitle(departmentName: string): string {
  const trimmed = departmentName.trim()
  if (!trimmed) return 'Department'
  if (trimmed.toLowerCase().endsWith('department')) return trimmed
  return `${trimmed} Department`
}

function mapConversation(id: string, data: Record<string, unknown>): Conversation {
  return {
    id,
    type: (data.type as Conversation['type']) ?? 'direct',
    title: data.title ? String(data.title) : undefined,
    description: data.description ? String(data.description) : undefined,
    imageURL: data.imageURL ? String(data.imageURL) : undefined,
    memberIds: Array.isArray(data.memberIds) ? data.memberIds.map(String) : [],
    departmentId: data.departmentId ? String(data.departmentId) : undefined,
    isDepartmentChannel: data.isDepartmentChannel === true,
    isTaskChannel: data.isTaskChannel === true,
    taskId: data.taskId ? String(data.taskId) : undefined,
    createdBy: String(data.createdBy ?? ''),
    lastMessage: data.lastMessage ? String(data.lastMessage) : undefined,
    lastMessageAt: data.lastMessageAt as Conversation['lastMessageAt'],
    createdAt: data.createdAt as Conversation['createdAt'],
    updatedAt: data.updatedAt as Conversation['updatedAt'],
  }
}

function mapMessage(id: string, data: Record<string, unknown>): ChatMessage {
  return {
    id,
    senderId: String(data.senderId ?? ''),
    type: (data.type as ChatMessage['type']) ?? 'text',
    text: data.text ? String(data.text) : undefined,
    attachment: data.attachment as ChatMessage['attachment'],
    taskEvent: data.taskEvent as ChatMessage['taskEvent'],
    replyToMessageId: data.replyToMessageId ? String(data.replyToMessageId) : undefined,
    createdAt: data.createdAt as ChatMessage['createdAt'],
    editedAt: data.editedAt as ChatMessage['editedAt'],
    deletedAt: data.deletedAt as ChatMessage['deletedAt'],
  }
}

function sortConversations(items: Conversation[]) {
  items.sort((a, b) => {
    const aMs = a.lastMessageAt?.toMillis() ?? 0
    const bMs = b.lastMessageAt?.toMillis() ?? 0
    return bMs - aMs
  })
  return items
}

export function subscribeConversations(
  userId: string,
  onData: (conversations: Conversation[]) => void,
): Unsubscribe {
  const q = query(conversationsCol, where('memberIds', 'array-contains', userId))
  return onSnapshot(q, (snap) => {
    onData(sortConversations(snap.docs.map((d) => mapConversation(d.id, d.data()))))
  })
}

/** Member inbox or full org list for admins (supervisory read). */
export function subscribeInbox(
  actor: AppUser,
  onData: (conversations: Conversation[]) => void,
): Unsubscribe {
  if (hasMinRole(actor, 'admin')) {
    return onSnapshot(conversationsCol, (snap) => {
      onData(sortConversations(snap.docs.map((d) => mapConversation(d.id, d.data()))))
    })
  }
  return subscribeConversations(actor.id, onData)
}

export async function getMyLastReadMs(
  conversationId: string,
  userId: string,
): Promise<number> {
  const snap = await getDoc(doc(db, 'conversations', conversationId, 'reads', userId))
  if (!snap.exists()) return 0
  const lastReadAt = snap.data().lastReadAt
  if (lastReadAt && typeof lastReadAt.toMillis === 'function') {
    return lastReadAt.toMillis()
  }
  return 0
}

export function subscribeConversation(
  conversationId: string,
  onData: (conversation: Conversation | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'conversations', conversationId),
    (snap) => {
      if (!snap.exists()) {
        onData(null)
        return
      }
      onData(mapConversation(snap.id, snap.data()))
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)))
      onData(null)
    },
  )
}

/** Conversation document id for a department group (not the department doc id). */
export async function findDepartmentChannelConversationId(
  departmentId: string,
): Promise<string | null> {
  const existing = await getDocs(
    query(
      conversationsCol,
      where('isDepartmentChannel', '==', true),
      where('departmentId', '==', departmentId),
    ),
  )
  return existing.empty ? null : existing.docs[0].id
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const snap = await getDoc(doc(db, 'conversations', conversationId))
  if (!snap.exists()) return null
  return mapConversation(snap.id, snap.data())
}

export function subscribeReadReceipts(
  conversationId: string,
  onData: (lastReadMsByUser: Map<string, number>) => void,
): Unsubscribe {
  const readsCol = collection(db, 'conversations', conversationId, 'reads')
  return onSnapshot(readsCol, (snap) => {
    const map = new Map<string, number>()
    for (const d of snap.docs) {
      const lastReadAt = d.data().lastReadAt
      if (lastReadAt && typeof lastReadAt.toMillis === 'function') {
        map.set(d.id, lastReadAt.toMillis())
      }
    }
    onData(map)
  })
}

export async function markConversationRead(
  actor: AppUser,
  conversationId: string,
): Promise<void> {
  const convoSnap = await getDoc(doc(db, 'conversations', conversationId))
  if (!convoSnap.exists()) return
  const convo = mapConversation(convoSnap.id, convoSnap.data())
  if (!canAccessConversation(actor, convo.memberIds)) return

  await setDoc(
    doc(db, 'conversations', conversationId, 'reads', actor.id),
    { lastReadAt: serverTimestamp() },
    { merge: true },
  )
}

export function subscribeMessages(
  conversationId: string,
  onData: (messages: ChatMessage[]) => void,
  pageSize = 50,
): Unsubscribe {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  )
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => mapMessage(d.id, d.data())).reverse()
    onData(messages)
  })
}

async function collectDepartmentChatMemberIds(departmentId: string): Promise<string[]> {
  const deptUsers = await listUsersByDepartment(departmentId)
  const ids = new Set(deptUsers.map((u) => u.id))
  try {
    const allUsers = await listActiveUsers()
    for (const u of allUsers) {
      if (hasMinRole(u, 'admin')) ids.add(u.id)
    }
  } catch {
    // Caller may not list all users; department assignees are still included.
  }
  return Array.from(ids)
}

/** Creates or refreshes the auto group for a department (everyone on users.departmentIds + company admins). */
export async function provisionDepartmentChannel(
  actor: AppUser,
  department: Pick<Department, 'id' | 'name'>,
): Promise<string> {
  if (!hasMinRole(actor, 'admin') && !canManageDepartmentChat(actor, department.id)) {
    throw new Error('You do not have permission to set up this department chat')
  }
  return getOrCreateDepartmentConversation(actor, {
    id: department.id,
    name: department.name,
    adminIds: [],
    memberIds: [],
    createdAt: undefined,
    updatedAt: undefined,
  })
}

export async function refreshDepartmentChannelRoster(
  actor: AppUser,
  departmentId: string,
  departmentName?: string,
): Promise<void> {
  const canSync =
    hasMinRole(actor, 'admin') || canManageDepartmentChat(actor, departmentId)
  if (!canSync) return

  const existing = await getDocs(
    query(
      conversationsCol,
      where('isDepartmentChannel', '==', true),
      where('departmentId', '==', departmentId),
    ),
  )

  const memberIds = await collectDepartmentChatMemberIds(departmentId)

  if (existing.empty) {
    if (!departmentName) return
    await getOrCreateDepartmentConversation(actor, {
      id: departmentId,
      name: departmentName,
      adminIds: [],
      memberIds: [],
      createdAt: undefined,
      updatedAt: undefined,
    })
    return
  }

  const title = departmentName ? departmentGroupTitle(departmentName) : undefined
  await updateDoc(doc(db, 'conversations', existing.docs[0].id), {
    memberIds,
    ...(title ? { title } : {}),
    updatedAt: serverTimestamp(),
  })
}

export async function syncDepartmentChannelTitle(
  actor: AppUser,
  departmentId: string,
  departmentName: string,
): Promise<void> {
  if (!hasMinRole(actor, 'admin') && !canManageDepartmentChat(actor, departmentId)) return
  const existing = await getDocs(
    query(
      conversationsCol,
      where('isDepartmentChannel', '==', true),
      where('departmentId', '==', departmentId),
    ),
  )
  if (existing.empty) return
  await updateDoc(doc(db, 'conversations', existing.docs[0].id), {
    title: departmentGroupTitle(departmentName),
    updatedAt: serverTimestamp(),
  })
}

/** Adds the signed-in user to their department team chat (after profile lists that department). */
export async function joinDepartmentChannelIfNeeded(
  actor: AppUser,
  departmentId: string,
): Promise<void> {
  if (!actor.departmentIds.includes(departmentId)) return

  const existing = await getDocs(
    query(
      conversationsCol,
      where('isDepartmentChannel', '==', true),
      where('departmentId', '==', departmentId),
    ),
  )
  if (existing.empty) return

  const convo = mapConversation(existing.docs[0].id, existing.docs[0].data())
  if (convo.memberIds.includes(actor.id)) return

  await updateDoc(doc(db, 'conversations', convo.id), {
    memberIds: [...convo.memberIds, actor.id],
    updatedAt: serverTimestamp(),
  })
}

export async function syncUserDepartmentChannels(
  actor: AppUser,
  departmentIds: string[],
  departmentNames: Map<string, string>,
): Promise<void> {
  if (!hasMinRole(actor, 'admin') && !canManageUsers(actor)) return
  for (const departmentId of departmentIds) {
    await refreshDepartmentChannelRoster(
      actor,
      departmentId,
      departmentNames.get(departmentId),
    )
  }
}

export async function syncDepartmentChannelMembers(
  actor: AppUser,
  conversation: Conversation,
): Promise<void> {
  if (!conversation.departmentId || !conversation.isDepartmentChannel) return
  if (!canManageDepartmentChat(actor, conversation.departmentId)) return

  const memberIds = await collectDepartmentChatMemberIds(conversation.departmentId)
  await updateDoc(doc(db, 'conversations', conversation.id), {
    memberIds,
    updatedAt: serverTimestamp(),
  })
}

export async function getOrCreateDepartmentConversation(
  actor: AppUser,
  department: Department,
): Promise<string> {
  const existing = await getDocs(
    query(
      conversationsCol,
      where('isDepartmentChannel', '==', true),
      where('departmentId', '==', department.id),
    ),
  )
  let memberIds = await collectDepartmentChatMemberIds(department.id)
  if (!memberIds.includes(actor.id)) {
    memberIds = [...memberIds, actor.id]
  }

  if (!existing.empty) {
    const convo = mapConversation(existing.docs[0].id, existing.docs[0].data())
    if (canManageDepartmentChat(actor, department.id)) {
      await updateDoc(doc(db, 'conversations', convo.id), {
        memberIds,
        title: departmentGroupTitle(department.name),
        updatedAt: serverTimestamp(),
      })
    }
    return convo.id
  }

  if (!canManageDepartmentChat(actor, department.id) && !memberIds.includes(actor.id)) {
    throw new Error('You cannot access this department channel')
  }

  const ref = await addDoc(conversationsCol, {
    type: 'group',
    isDepartmentChannel: true,
    departmentId: department.id,
    title: departmentGroupTitle(department.name),
    memberIds,
    createdBy: actor.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  })
  return ref.id
}

export async function ensureDepartmentChannels(
  actor: AppUser,
  departments: Department[],
): Promise<void> {
  if (hasMinRole(actor, 'admin')) {
    for (const dept of departments) {
      const existing = await getDocs(
        query(
          conversationsCol,
          where('isDepartmentChannel', '==', true),
          where('departmentId', '==', dept.id),
        ),
      )
      if (existing.empty) {
        await getOrCreateDepartmentConversation(actor, dept)
      } else {
        const convo = mapConversation(existing.docs[0].id, existing.docs[0].data())
        await syncDepartmentChannelMembers(actor, convo)
      }
    }
    return
  }

  for (const deptId of actor.departmentIds) {
    await joinDepartmentChannelIfNeeded(actor, deptId)
    if (!canManageDepartmentChat(actor, deptId)) continue
    const dept = departments.find((d) => d.id === deptId)
    if (!dept) continue
    const existing = await getDocs(
      query(
        conversationsCol,
        where('isDepartmentChannel', '==', true),
        where('departmentId', '==', dept.id),
      ),
    )
    if (existing.empty) {
      await getOrCreateDepartmentConversation(actor, dept)
    } else {
      const convo = mapConversation(existing.docs[0].id, existing.docs[0].data())
      await syncDepartmentChannelMembers(actor, convo)
    }
  }
}

export async function getOrCreateDirectConversation(
  actor: AppUser,
  otherUserId: string,
): Promise<string> {
  if (otherUserId === actor.id) {
    throw new Error('You cannot message yourself')
  }

  const existing = await getDocs(
    query(conversationsCol, where('type', '==', 'direct'), where('memberIds', 'array-contains', actor.id)),
  )
  const found = existing.docs.find((d) => {
    const data = mapConversation(d.id, d.data())
    return data.memberIds.length === 2 && data.memberIds.includes(otherUserId)
  })
  if (found) return found.id

  const memberIds = [actor.id, otherUserId].sort()
  const ref = await addDoc(conversationsCol, {
    type: 'direct',
    memberIds,
    createdBy: actor.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  })
  return ref.id
}

export async function createCustomGroupConversation(
  actor: AppUser,
  title: string,
  memberIds: string[],
): Promise<string> {
  const unique = Array.from(new Set([actor.id, ...memberIds]))
  if (unique.length < 2) {
    throw new Error('Select at least one other person')
  }
  const trimmedTitle = title.trim()
  if (trimmedTitle.length < 2) {
    throw new Error('Group name is required')
  }

  const ref = await addDoc(conversationsCol, {
    type: 'group',
    isDepartmentChannel: false,
    title: trimmedTitle,
    memberIds: unique,
    createdBy: actor.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  })
  return ref.id
}

export async function sendTextMessage(
  actor: AppUser,
  conversationId: string,
  text: string,
  replyToMessageId?: string,
): Promise<void> {
  const convoSnap = await getDoc(doc(db, 'conversations', conversationId))
  if (!convoSnap.exists()) throw new Error('Conversation not found')
  const convo = mapConversation(convoSnap.id, convoSnap.data())
  if (!canAccessConversation(actor, convo.memberIds)) {
    throw new Error('Access denied')
  }
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > 4000) {
    throw new Error('Message must be between 1 and 4000 characters')
  }
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId: actor.id,
    type: 'text',
    text: trimmed,
    replyToMessageId: replyToMessageId ?? null,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: trimmed.slice(0, 120),
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  try {
    await notifyConversationMessage(actor, convo, trimmed)
  } catch (err) {
    console.error('message notification failed', err)
  }
}

/** Firestore rejects `undefined` field values — omit optional keys. */
function attachmentForFirestore(
  attachment: NonNullable<ChatMessage['attachment']>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attachment)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

export async function sendAttachmentMessage(
  actor: AppUser,
  conversationId: string,
  payload: {
    type: ChatMessage['type']
    attachment: NonNullable<ChatMessage['attachment']>
    text?: string
  },
): Promise<void> {
  const convoRef = doc(db, 'conversations', conversationId)
  const convoSnap = await getDoc(convoRef)
  if (!convoSnap.exists()) throw new Error('Conversation not found')
  const convo = mapConversation(convoSnap.id, convoSnap.data())
  if (!canAccessConversation(actor, convo.memberIds)) {
    throw new Error('Access denied')
  }
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId: actor.id,
    type: payload.type,
    text: payload.text ?? null,
    attachment: attachmentForFirestore(payload.attachment),
    createdAt: serverTimestamp(),
  })
  await updateDoc(convoRef, {
    lastMessage: payload.text?.slice(0, 120) ?? `[${payload.type}]`,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const preview = payload.text?.trim() || `[${payload.type}]`
  try {
    await notifyConversationMessage(actor, convo, preview)
  } catch (err) {
    console.error('message notification failed', err)
  }
}

export function conversationLabel(
  convo: Conversation,
  actorId: string,
  usersById: Map<string, AppUser>,
): string {
  if (convo.isDepartmentChannel && convo.title) return convo.title
  if (convo.type === 'group' && convo.title) return convo.title
  if (convo.type === 'direct') {
    const otherId = convo.memberIds.find((id) => id !== actorId)
    const other = otherId ? usersById.get(otherId) : undefined
    return other?.displayName?.trim() || 'Chat'
  }
  return 'Conversation'
}
