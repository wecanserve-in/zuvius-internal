import { useEffect, useMemo, useState } from 'react'
import { listDepartments } from '@/services/departments.service'
import {
  ensureDepartmentChannels,
  getMyLastReadMs,
  subscribeInbox,
} from '@/services/conversations.service'
import { isTaskNotificationDm } from '@/services/taskChat.service'
import { listUsersForMessaging, loadUsersByIds } from '@/services/users.service'
import type { AppUser, Conversation, Department } from '@/types'

/** Task/project chats live on the task screen — not in Messages. */
export function isMessagesHubConversation(c: Conversation): boolean {
  if (c.isTaskChannel) return false
  if (c.type === 'direct' && isTaskNotificationDm(c)) return false
  return c.isDepartmentChannel === true || c.type === 'direct'
}

export function useMessagingInbox(profile: AppUser | null | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())
  const [departments, setDepartments] = useState<Department[]>([])
  const [unreadById, setUnreadById] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!profile) return
    void listUsersForMessaging().then(setUsers)
    void listDepartments().then(setDepartments)
    return subscribeInbox(profile, (all) => {
      setConversations(all.filter(isMessagesHubConversation))
    })
  }, [profile?.id])

  useEffect(() => {
    const base = new Map(users.map((u) => [u.id, u]))
    const ids = conversations.flatMap((c) => c.memberIds)
    void loadUsersByIds(ids, base).then(setUsersById)
  }, [users, conversations])

  useEffect(() => {
    if (!profile || departments.length === 0) return
    void ensureDepartmentChannels(profile, departments)
  }, [profile?.id, departments])

  useEffect(() => {
    if (!profile || conversations.length === 0) return
    void (async () => {
      const next: Record<string, boolean> = {}
      for (const c of conversations) {
        if (!c.lastMessageAt) continue
        const readMs = await getMyLastReadMs(c.id, profile.id)
        next[c.id] = c.lastMessageAt.toMillis() > readMs
      }
      setUnreadById(next)
    })()
  }, [profile?.id, conversations])

  const grouped = useMemo(() => {
    const dept: Conversation[] = []
    const direct: Conversation[] = []
    for (const c of conversations) {
      if (c.isDepartmentChannel) dept.push(c)
      else if (c.type === 'direct') direct.push(c)
    }
    return { dept, direct }
  }, [conversations])

  const people = useMemo(
    () => (users.length > 0 ? users : [...usersById.values()].filter((u) => u.isActive)),
    [users, usersById],
  )

  return {
    conversations,
    grouped,
    usersById,
    departments,
    people,
    unreadById,
  }
}
