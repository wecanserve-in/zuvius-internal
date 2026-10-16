import { createContext, useContext, type ReactNode } from 'react'
import { useMessagingInbox } from '@/features/messaging/useMessagingInbox'
import { useAuth } from '@/features/auth/AuthContext'

type InboxState = ReturnType<typeof useMessagingInbox>

const MessagingInboxContext = createContext<InboxState | null>(null)

export function MessagingInboxProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const value = useMessagingInbox(profile)
  return <MessagingInboxContext.Provider value={value}>{children}</MessagingInboxContext.Provider>
}

export function useMessagingInboxContext(): InboxState {
  const ctx = useContext(MessagingInboxContext)
  if (!ctx) {
    throw new Error('useMessagingInboxContext must be used within MessagingInboxProvider')
  }
  return ctx
}
