import { MessageSquare, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MessageBubble } from '@/features/messaging/MessageBubble'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  collectTaskChatMemberIds,
  ensureTaskGroupConversation,
} from '@/services/taskChat.service'
import { markConversationRead, sendTextMessage, subscribeMessages } from '@/services/conversations.service'
import { loadUsersByIds } from '@/services/users.service'
import type { AppUser, ChatMessage, Conversation, Task, TaskHistoryEvent } from '@/types'

export function TaskChatPanel({
  task,
  history,
  profile,
  open,
  onClose,
}: {
  task: Task
  history: TaskHistoryEvent[]
  profile: AppUser
  open: boolean
  onClose: () => void
}) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    void ensureTaskGroupConversation(profile, task, history)
      .then((id) => {
        setConversationId(id)
        setConversation({
          id,
          type: 'group',
          title: task.title,
          memberIds: collectTaskChatMemberIds(task, history),
          createdBy: task.createdBy,
          isTaskChannel: true,
          taskId: task.id,
        })
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not open chat')
      })
      .finally(() => setLoading(false))
  }, [open, task.id, profile.id, history])

  useEffect(() => {
    if (!conversationId || !open) return
    return subscribeMessages(conversationId, setMessages)
  }, [conversationId, open])

  useEffect(() => {
    if (!conversationId || !open) return
    void markConversationRead(profile, conversationId)
  }, [conversationId, open, profile.id, messages.length])

  useEffect(() => {
    const ids = [...new Set(messages.map((m) => m.senderId))]
    void loadUsersByIds(ids).then(setUsersById)
  }, [messages])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] top-[calc(3.5rem+env(safe-area-inset-top))] z-50 flex flex-col overflow-hidden border-[var(--color-border)] bg-[var(--color-card)] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:z-30 sm:mt-2 sm:h-auto sm:max-h-[min(24rem,70vh)] sm:w-96 sm:rounded-md sm:border sm:shadow-lg"
      role="dialog"
      aria-label="Task chat"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
          Task chat
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:max-h-72 sm:min-h-40">
        {loading ? (
          <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">Opening chat…</p>
        ) : error ? (
          <p className="py-4 text-center text-xs text-danger">{error}</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">
            Messages for everyone on this task.
          </p>
        ) : (
          <div className="space-y-2">
            {conversation
              ? messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    conversation={conversation}
                    profileId={profile.id}
                    usersById={usersById}
                    lastReadMsByUser={new Map()}
                  />
                ))
              : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-[var(--color-border)] p-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!conversationId || !text.trim()) return
          void sendTextMessage(profile, conversationId, text.trim())
            .then(() => setText(''))
            .catch((err) => setError(err instanceof Error ? err.message : 'Send failed'))
        }}
      >
        <Input
          className="h-8 text-sm"
          placeholder="Message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!conversationId || loading}
        />
        <Button type="submit" size="sm" className="h-8 px-2" disabled={!conversationId || loading || !text.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  )
}
