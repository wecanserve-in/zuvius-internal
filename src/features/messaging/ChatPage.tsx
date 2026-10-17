import { useEffect, useRef, useState } from 'react'
import { Info, Paperclip, Send, X } from 'lucide-react'
import { useChatTitle } from '@/features/messaging/ChatTitleContext'
import { MessageBubble } from '@/features/messaging/MessageBubble'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { VoiceRecorder } from '@/features/messaging/VoiceRecorder'
import { useAuth } from '@/features/auth/AuthContext'
import {
  conversationLabel,
  markConversationRead,
  sendAttachmentMessage,
  sendTextMessage,
  subscribeConversation,
  subscribeMessages,
  subscribeReadReceipts,
} from '@/services/conversations.service'
import { canParticipateInConversation, formatUserRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { loadUsersByIds } from '@/services/users.service'
import { resolveMessageAttachmentUrl } from '@/lib/attachmentUrl'
import {
  formatUploadCallableError,
  uploadConversationAttachment,
} from '@/services/uploads.service'
import type { AppUser, Conversation } from '@/types'
import type { ChatMessage } from '@/types'

type PendingFile = {
  file: File
  messageType: ChatMessage['type']
  previewUrl: string | null
}

function messageTypeForFile(file: File): ChatMessage['type'] {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'file'
}

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { profile } = useAuth()
  const { setChatTitle } = useChatTitle()
  const [conversation, setConversation] = useState<Conversation | null | undefined>(undefined)
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [lastReadMsByUser, setLastReadMsByUser] = useState<Map<string, number>>(new Map())
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearPendingFile = () => {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl)
    setPendingFile(null)
  }

  useEffect(() => {
    return () => {
      if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl)
    }
  }, [pendingFile?.previewUrl])

  useEffect(() => {
    if (!conversationId) return
    return subscribeMessages(conversationId, setMessages)
  }, [conversationId])

  useEffect(() => {
    setConversation(undefined)
    setConversationError(null)
    if (!conversationId) return
    return subscribeConversation(
      conversationId,
      (data) => setConversation(data),
      (err) => setConversationError(err.message || 'Could not load this chat'),
    )
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return
    return subscribeReadReceipts(conversationId, setLastReadMsByUser)
  }, [conversationId])

  useEffect(() => {
    if (!conversation) return
    let cancelled = false
    const taskUserIds = messages.flatMap((m) => {
      const e = m.taskEvent
      if (!e) return []
      return [e.assignedById, e.assigneeId, e.previousAssigneeId].filter(
        (id): id is string => Boolean(id),
      )
    })
    const ids = [...new Set([...conversation.memberIds, ...taskUserIds])]
    void loadUsersByIds(ids).then((map) => {
      if (!cancelled) setUsersById(map)
    })
    return () => {
      cancelled = true
    }
  }, [conversation?.id, conversation?.memberIds.join(','), messages])

  const chatTitle =
    profile && conversation
      ? conversationLabel(conversation, profile.id, usersById)
      : 'Messages'

  useEffect(() => {
    setChatTitle(chatTitle)
    return () => setChatTitle(null)
  }, [chatTitle, setChatTitle])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!profile || !conversationId || messages.length === 0) return
    void markConversationRead(profile, conversationId)
  }, [profile, conversationId, messages])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const resolved: Record<string, string> = {}
      for (const m of messages) {
        if (m.type === 'text' || !m.attachment) continue
        try {
          const url = await resolveMessageAttachmentUrl(m.attachment)
          if (url) resolved[m.id] = url
        } catch {
          // missing objectKey / upload config
        }
      }
      if (cancelled || !Object.keys(resolved).length) return
      setAttachmentUrls((prev) => {
        let changed = false
        const merged = { ...prev }
        for (const [id, url] of Object.entries(resolved)) {
          if (merged[id] !== url) {
            merged[id] = url
            changed = true
          }
        }
        return changed ? merged : prev
      })
    })()
    return () => {
      cancelled = true
    }
  }, [messages])

  if (!conversationId || !profile) return null
  if (conversation === undefined) return <LoadingScreen />
  if (conversation === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm">
        <p className="font-medium">Chat not found</p>
        <p className="text-[var(--color-muted-foreground)]">
          {conversationError ??
            'This conversation does not exist or you do not have access. Open it from Messages or Departments.'}
        </p>
      </div>
    )
  }
  if (!messages && uploading) return <LoadingScreen />

  const canSend = canParticipateInConversation(profile, conversation.memberIds)

  const send = async () => {
    if (!text.trim()) return
    await sendTextMessage(profile, conversationId, text)
    setText('')
  }

  const uploadAndSend = async (
    file: Blob,
    fileName: string,
    contentType: string,
    messageType: ChatMessage['type'],
    extra?: { durationMs?: number; caption?: string },
  ) => {
    setUploadError(null)
    setUploading(true)
    try {
      const attachment = await uploadConversationAttachment(
        conversationId,
        file,
        fileName,
        contentType,
      )
      const caption = extra?.caption?.trim()
      await sendAttachmentMessage(profile, conversationId, {
        type: messageType,
        text: caption || undefined,
        attachment: { ...attachment, durationMs: extra?.durationMs },
      })
    } catch (err) {
      setUploadError(formatUploadCallableError(err))
      throw err
    } finally {
      setUploading(false)
    }
  }

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError(null)
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl)
    const messageType = messageTypeForFile(file)
    const canPreview =
      messageType === 'image' || messageType === 'video' || messageType === 'audio'
    const previewUrl = canPreview ? URL.createObjectURL(file) : null
    setPendingFile({ file, messageType, previewUrl })
  }

  const sendPendingFile = async () => {
    if (!pendingFile) return
    const { file, messageType } = pendingFile
    const caption = text.trim()
    try {
      await uploadAndSend(file, file.name, file.type || 'application/octet-stream', messageType, {
        caption,
      })
      clearPendingFile()
      setText('')
    } catch {
      // uploadError set
    }
  }

  const cancelPendingFile = () => {
    clearPendingFile()
    setUploadError(null)
  }

  const onVoice = async (blob: Blob, mimeType: string, durationMs: number) => {
    const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm'
    const fileName = `voice-${Date.now()}.${ext}`
    try {
      await uploadAndSend(blob, fileName, mimeType, 'audio', { durationMs })
    } catch {
      // uploadError set
    }
  }

  const members = conversation.memberIds
    .map((id) => usersById.get(id))
    .filter((u): u is AppUser => Boolean(u))

  return (
    <div className="flex h-full min-h-0 bg-[var(--color-background)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-3 py-2 md:hidden">
          <p className="truncate text-sm font-medium">{chatTitle}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Conversation details"
            onClick={() => setDetailsOpen((v) => !v)}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        <div className="hidden shrink-0 items-center justify-end border-b border-[var(--color-border)] px-3 py-1.5 md:flex">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setDetailsOpen((v) => !v)}
          >
            <Info className="h-3.5 w-3.5" />
            {detailsOpen ? 'Hide details' : 'Details'}
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-4">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              conversation={conversation}
              profileId={profile.id}
              usersById={usersById}
              lastReadMsByUser={lastReadMsByUser}
              attachmentUrl={attachmentUrls[m.id]}
            />
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="shrink-0 border-t border-[var(--color-border)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
          {!canSend ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              View only — you are not a member of this chat.
            </p>
          ) : null}
          {uploadError ? (
            <p className="text-sm text-danger" role="alert">{uploadError}</p>
          ) : null}
          {canSend && pendingFile ? (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Attachment preview
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label="Remove attachment"
                  disabled={uploading}
                  onClick={cancelPendingFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {pendingFile.messageType === 'image' && pendingFile.previewUrl ? (
                <img
                  src={pendingFile.previewUrl}
                  alt=""
                  className="mb-2 max-h-40 rounded-md object-contain"
                />
              ) : null}
              {pendingFile.messageType === 'video' && pendingFile.previewUrl ? (
                <video
                  src={pendingFile.previewUrl}
                  controls
                  className="mb-2 max-h-40 max-w-full rounded-md"
                />
              ) : null}
              {pendingFile.messageType === 'audio' && pendingFile.previewUrl ? (
                <audio src={pendingFile.previewUrl} controls className="mb-2 w-full" />
              ) : null}
              <p className="truncate text-sm">{pendingFile.file.name}</p>
              <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                Add a caption below, then tap Send to upload.
              </p>
            </div>
          ) : null}
          {canSend ? (
            <VoiceRecorder
              layout="composer"
              onRecorded={onVoice}
              disabled={uploading || Boolean(pendingFile)}
            >
              <input ref={fileInputRef} type="file" className="hidden" onChange={onFilePick} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                className="min-w-0 flex-1"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={pendingFile ? 'Add a caption (optional)…' : 'Type a message…'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (pendingFile) void sendPendingFile()
                    else void send()
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => void (pendingFile ? sendPendingFile() : send())}
                disabled={uploading || (pendingFile ? false : !text.trim())}
              >
                <Send className="h-4 w-4" />
              </Button>
            </VoiceRecorder>
          ) : null}
        </div>
      </div>
      {detailsOpen ? (
        <aside
          className={cn(
            'flex shrink-0 flex-col border-[var(--color-border)] bg-[var(--color-card)]',
            'fixed inset-0 z-50 md:static md:inset-auto md:z-auto md:w-64 md:border-l',
          )}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
            <p className="text-sm font-medium">Members</p>
            <Button type="button" variant="ghost" size="icon" onClick={() => setDetailsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {members.map((u) => (
              <li key={u.id} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
                  {u.displayName.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.displayName}</p>
                  <p className="text-xs capitalize text-[var(--color-muted-foreground)]">
                    {formatUserRole(u.role)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
  )
}
