import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type ChatTitleContextValue = {
  chatTitle: string | null
  setChatTitle: (title: string | null) => void
}

const ChatTitleContext = createContext<ChatTitleContextValue | null>(null)

export function ChatTitleProvider({ children }: { children: ReactNode }) {
  const [chatTitle, setChatTitle] = useState<string | null>(null)
  const value = useMemo(() => ({ chatTitle, setChatTitle }), [chatTitle])
  return <ChatTitleContext.Provider value={value}>{children}</ChatTitleContext.Provider>
}

export function useChatTitle() {
  const ctx = useContext(ChatTitleContext)
  if (!ctx) {
    throw new Error('useChatTitle must be used within ChatTitleProvider')
  }
  return ctx
}
