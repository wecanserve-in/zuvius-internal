import { useEffect, useState } from 'react'
import { subscribeNotifications } from '@/services/notifications.service'
import type { AppNotification } from '@/types'

export function useCompanionNotifications(userId: string | undefined) {
  const [items, setItems] = useState<AppNotification[] | null>(null)

  useEffect(() => {
    if (!userId) {
      setItems(null)
      return
    }
    return subscribeNotifications(userId, setItems)
  }, [userId])

  return items
}
