import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { AppUser, Conversation } from '@/types'

function messageNotificationType(convo: Conversation): 'message_direct' | 'message_group' {
  return convo.type === 'direct' ? 'message_direct' : 'message_group'
}

function messageNotificationTitle(convo: Conversation): string {
  if (convo.isTaskChannel) {
    const name = convo.title?.trim() || 'Task'
    return `Task chat: ${name}`
  }
  if (convo.type === 'direct') return 'New direct message'
  return convo.title?.trim() ? `Message in ${convo.title.trim()}` : 'New group message'
}

/** Notify other conversation members (in-app notifications + Baby CEO). */
export async function notifyConversationMessage(
  actor: AppUser,
  convo: Conversation,
  preview: string,
): Promise<void> {
  const trimmed = preview.trim()
  if (!trimmed) return

  const type = messageNotificationType(convo)
  const title = messageNotificationTitle(convo)
  const body = `${actor.displayName}: ${trimmed.slice(0, 200)}`

  for (const recipientId of convo.memberIds) {
    if (recipientId === actor.id) continue
    await addDoc(collection(db, 'notifications'), {
      recipientId,
      type,
      title,
      body,
      entityType: 'conversation',
      entityId: convo.id,
      readAt: null,
      createdAt: serverTimestamp(),
    })
  }
}
