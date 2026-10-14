import { MessageSquare } from 'lucide-react'
import { Outlet, useParams } from 'react-router-dom'
import { ConversationListPanel } from '@/features/messaging/ConversationListPanel'

function MessagesPlaceholder() {
  return (
    <div className="hidden h-full flex-col items-center justify-center text-center md:flex">
      <MessageSquare className="mb-3 h-10 w-10 text-[var(--color-muted-foreground)]" />
      <p className="text-sm font-medium">Select a conversation</p>
      <p className="mt-1 max-w-xs text-xs text-[var(--color-muted-foreground)]">
        Choose a department group, colleague, or custom group from the list.
      </p>
    </div>
  )
}

export function MessagesLayout() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const showChat = Boolean(conversationId)

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden">
      <ConversationListPanel
        className={showChat ? 'hidden w-full md:flex md:w-72 md:shrink-0 md:border-r' : 'w-full md:w-72 md:shrink-0 md:border-r'}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {showChat ? <Outlet /> : <MessagesPlaceholder />}
      </div>
    </div>
  )
}
