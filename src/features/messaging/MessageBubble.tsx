import { format } from 'date-fns'
import {
  MessageReceiptTicks,
  receiptStatusForMessage,
} from '@/features/messaging/MessageReceiptTicks'
import { TaskChatMessageCard } from '@/features/messaging/TaskChatMessageCard'
import { VoiceMessagePlayer } from '@/features/messaging/VoiceMessagePlayer'
import type { AppUser, ChatMessage, Conversation } from '@/types'

function showSenderLabel(conversation: Conversation): boolean {
  return (
    conversation.isDepartmentChannel === true ||
    conversation.type === 'group' ||
    conversation.memberIds.length > 2
  )
}

export function MessageBubble({
  message,
  conversation,
  profileId,
  usersById,
  lastReadMsByUser,
  attachmentUrl,
}: {
  message: ChatMessage
  conversation: Conversation
  profileId: string
  usersById: Map<string, AppUser>
  lastReadMsByUser: Map<string, number>
  attachmentUrl?: string
}) {
  const isOwn = message.senderId === profileId
  const sender = usersById.get(message.senderId)
  const senderName = sender?.displayName?.trim() || 'Team member'
  const showName = showSenderLabel(conversation) && !isOwn
  const timeLabel = message.createdAt ? format(message.createdAt.toDate(), 'HH:mm') : ''
  const receipt = receiptStatusForMessage(
    message,
    profileId,
    conversation.memberIds,
    lastReadMsByUser,
  )

  const isTaskEvent = Boolean(message.taskEvent)
  const isVoice = message.type === 'audio'

  if (isTaskEvent && message.taskEvent) {
    return (
      <div
        className={`flex max-w-[min(100%,320px)] flex-col gap-1 sm:max-w-[85%] ${
          isOwn ? 'ml-auto items-end' : 'items-start'
        }`}
      >
        {showName ? (
          <span className="px-1 text-xs font-medium text-[var(--color-muted-foreground)]">
            {senderName}
          </span>
        ) : null}
        <TaskChatMessageCard event={message.taskEvent} usersById={usersById} />
        <div className="flex items-center justify-end gap-1 px-1 text-[10px] text-[var(--color-muted-foreground)]">
          {timeLabel ? <span>{timeLabel}</span> : null}
          {isOwn && receipt ? <MessageReceiptTicks status={receipt} /> : null}
        </div>
      </div>
    )
  }
  const bubbleShell = isVoice
    ? isOwn
      ? 'rounded-2xl rounded-br-md bg-[var(--color-primary)] p-2 shadow-sm'
      : 'rounded-2xl rounded-bl-md bg-[var(--color-muted)] p-2 shadow-sm'
    : `rounded-2xl px-3 py-2 text-sm shadow-sm ${
        isOwn
          ? 'rounded-br-md bg-[var(--color-primary)] text-white'
          : 'rounded-bl-md bg-[var(--color-muted)] text-[var(--color-foreground)]'
      }`

  const metaRow = (
    <div
      className={`flex items-center justify-end gap-1 text-[10px] ${
        isVoice
          ? 'px-1 text-[var(--color-muted-foreground)]'
          : isOwn
            ? 'mt-1 text-white/80'
            : 'mt-1 text-[var(--color-muted-foreground)]'
      }`}
    >
      {timeLabel ? <span>{timeLabel}</span> : null}
      {isOwn && receipt ? <MessageReceiptTicks status={receipt} /> : null}
    </div>
  )

  return (
    <div
      className={`flex max-w-[min(100%,320px)] flex-col gap-0.5 sm:max-w-[85%] ${
        isOwn ? 'ml-auto items-end' : 'items-start'
      }`}
    >
      {showName ? (
        <span className="px-1 text-xs font-medium text-[var(--color-muted-foreground)]">
          {senderName}
        </span>
      ) : null}
      <div className={bubbleShell}>
        {message.type === 'text' ? (
          <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
        ) : null}
        {message.type === 'audio' && attachmentUrl ? (
          <VoiceMessagePlayer
            src={attachmentUrl}
            durationMs={message.attachment?.durationMs}
            isOwn={isOwn}
          />
        ) : null}
        {message.type === 'image' && attachmentUrl ? (
          <a href={attachmentUrl} target="_blank" rel="noreferrer" className="block">
            <img
              src={attachmentUrl}
              alt={message.attachment?.fileName ?? 'Image'}
              className="max-h-64 max-w-full rounded-md object-contain"
            />
          </a>
        ) : null}
        {message.type === 'video' && attachmentUrl ? (
          <video controls src={attachmentUrl} className="max-h-64 max-w-full rounded-md" />
        ) : null}
        {message.type === 'file' && message.attachment && attachmentUrl ? (
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className={`underline ${isOwn ? 'text-white' : 'text-[var(--color-primary)]'}`}
          >
            {message.attachment.fileName ?? 'Download file'}
          </a>
        ) : null}
        {message.attachment && !attachmentUrl && message.type !== 'text' ? (
          <p className="text-xs opacity-80">Loading attachment…</p>
        ) : null}
        {message.type !== 'text' && message.text ? (
          <p
            className={`mt-2 whitespace-pre-wrap break-words text-sm ${
              isVoice
                ? `px-1 ${isOwn ? 'text-white/95' : 'text-[var(--color-foreground)]'}`
                : ''
            }`}
          >
            {message.text}
          </p>
        ) : null}
        {!isVoice ? metaRow : null}
      </div>
      {isVoice ? metaRow : null}
    </div>
  )
}
