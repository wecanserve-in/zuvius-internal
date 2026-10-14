import { Check, CheckCheck } from 'lucide-react'
import type { ChatMessage } from '@/types'

export type ReceiptStatus = 'sent' | 'delivered' | 'read'

export function receiptStatusForMessage(
  message: ChatMessage,
  actorId: string,
  memberIds: string[],
  lastReadMsByUser: Map<string, number>,
): ReceiptStatus | null {
  if (message.senderId !== actorId) return null
  if (!message.createdAt) return 'sent'

  const msgMs = message.createdAt.toMillis()
  const others = memberIds.filter((id) => id !== actorId)
  if (others.length === 0) return 'delivered'

  const allRead = others.every((id) => (lastReadMsByUser.get(id) ?? 0) >= msgMs)
  return allRead ? 'read' : 'delivered'
}

export function MessageReceiptTicks({ status }: { status: ReceiptStatus }) {
  if (status === 'sent') {
    return <Check className="h-3.5 w-3.5 shrink-0 opacity-80" aria-label="Sent" />
  }
  if (status === 'read') {
    return (
      <CheckCheck
        className="h-3.5 w-3.5 shrink-0 text-emerald-300"
        aria-label="Seen"
      />
    )
  }
  return (
    <CheckCheck className="h-3.5 w-3.5 shrink-0 opacity-80" aria-label="Delivered" />
  )
}
