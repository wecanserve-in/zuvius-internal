import { useCallback, useMemo, useState } from 'react'
import { dismissDailyMotivation, loadDailyMotivation } from '@/lib/companion/dailyMotivationStore'

/**
 * One motivational quote per calendar day per user.
 * State is seeded from localStorage so route changes / remounts do not re-trigger selection.
 */
export function useDailyMotivation(userId: string) {
  const initial = useMemo(() => loadDailyMotivation(userId), [userId])
  const [visible, setVisible] = useState(initial.visible)
  const [quote] = useState(initial.quote)
  const [quoteId] = useState(initial.quoteId)

  const dismiss = useCallback(() => {
    dismissDailyMotivation(userId)
    setVisible(false)
  }, [userId])

  return {
    quote,
    quoteId,
    visible,
    dismiss,
  }
}
