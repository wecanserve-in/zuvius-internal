import { useCallback, useEffect, useRef, useState } from 'react'
import { useCelebrationSequence } from '@/hooks/useCelebrationSequence'
import type { CompanionReaction } from '@/lib/companion/companionReactions'
import {
  idleQuietReaction,
  reactionToMood,
  reactionsFromNotifications,
  reactionsFromTaskTransitions,
  sortReactions,
  type ReactionKind,
} from '@/lib/companion/companionReactions'
import { pickCompanionMood, computeCompanionStats, type CompanionMood } from '@/lib/companion/companionStats'
import type { AppNotification, Task } from '@/types'

const DISMISSED_UI_KEY = 'zuvius-baby-ceo-dismissed'

function readDismissedUi(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_UI_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function persistDismissedUi(set: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_UI_KEY, JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

export function useBabyCeoReactions(
  tasks: Task[] | null,
  notifications: AppNotification[] | null,
  userId: string,
) {
  const [queue, setQueue] = useState<CompanionReaction[]>([])
  const [dismissedUi, setDismissedUi] = useState<Set<string>>(() => readDismissedUi())
  const [activeKind, setActiveKind] = useState<ReactionKind | null>(null)
  const snapshot = useRef({ status: new Map<string, string>(), hydrated: false })
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enqueue = useCallback((incoming: CompanionReaction[]) => {
    if (incoming.length === 0) return
    setQueue((prev) => {
      const keys = new Set(prev.map((r) => r.dedupKey))
      const merged = [...prev]
      for (const r of sortReactions(incoming)) {
        if (keys.has(r.dedupKey)) continue
        keys.add(r.dedupKey)
        merged.push(r)
      }
      return sortReactions(merged)
    })
  }, [])

  useEffect(() => {
    if (!tasks || !notifications) return

    const fromNotif = reactionsFromNotifications(notifications)
    const { reactions: fromTasks, next } = reactionsFromTaskTransitions(
      tasks,
      userId,
      snapshot.current,
    )
    snapshot.current = next
    enqueue([...fromNotif, ...fromTasks])
  }, [tasks, notifications, userId, enqueue])

  const visibleQueue = queue.filter((r) => !dismissedUi.has(r.id))
  const active = visibleQueue[0] ?? null

  const celebrating = active?.kind === 'celebrate'
  const celebration = useCelebrationSequence(celebrating, active?.id)

  useEffect(() => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current)
    if (!active) {
      setActiveKind(null)
      return
    }
    setActiveKind(active.kind)
    const ms = active.kind === 'celebrate' ? 4200 : 1400
    reactionTimer.current = setTimeout(() => setActiveKind(null), ms)
    return () => {
      if (reactionTimer.current) clearTimeout(reactionTimer.current)
    }
  }, [active?.id, active?.kind])

  const stats = tasks ? computeCompanionStats(tasks, userId) : null
  const baseMood: CompanionMood = stats
    ? pickCompanionMood(stats)
    : 'idle'

  const displayMood: CompanionMood =
    activeKind !== null ? reactionToMood(activeKind) : baseMood

  const dismissReaction = useCallback((reactionId: string) => {
    setDismissedUi((prev) => {
      const next = new Set(prev)
      next.add(reactionId)
      persistDismissedUi(next)
      return next
    })
  }, [])

  const peekIdleQuiet = useCallback(() => {
    const idle = idleQuietReaction()
    if (idle) enqueue([idle])
  }, [enqueue])

  return {
    active,
    panelReactions: visibleQueue,
    displayMood,
    dismissReaction,
    peekIdleQuiet,
    stats,
    celebration,
    celebrating,
  }
}
