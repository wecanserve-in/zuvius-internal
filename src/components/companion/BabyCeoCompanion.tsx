import { X, Minus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BabyCeoCharacter } from '@/components/companion/BabyCeoCharacter'
import { CelebrationBurst } from '@/components/companion/CelebrationBurst'
import { CelebrationSparkles } from '@/components/companion/CelebrationSparkles'
import { DailyMotivationBubble } from '@/components/companion/DailyMotivationBubble'
import { Button } from '@/components/ui/button'
import type { CelebrationPhase } from '@/hooks/useCelebrationSequence'
import { useBabyCeoReactions } from '@/hooks/useBabyCeoReactions'
import { useCompanionDrag } from '@/hooks/useCompanionDrag'
import { useDailyMotivation } from '@/hooks/useDailyMotivation'
import { useCompanionNotifications } from '@/hooks/useCompanionNotifications'
import { useCompanionTasks } from '@/hooks/useCompanionTasks'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { CompanionReaction } from '@/lib/companion/companionReactions'
import type { CompanionMood } from '@/lib/companion/companionStats'
import { cn } from '@/lib/utils'
import {
  clampAnchorPosition,
  COMPANION_SIZE_COMPACT,
  COMPANION_SIZE_EXPANDED,
  estimateBubbleWidth,
  estimatePanelWidth,
} from '@/lib/companion/companionPosition'
import { markNotificationRead } from '@/services/notifications.service'

function estimateClusterSize(
  panelOpen: boolean,
  isExpanded: boolean,
): { width: number; height: number } {
  const avatar = isExpanded ? COMPANION_SIZE_EXPANDED : COMPANION_SIZE_COMPACT
  if (panelOpen) {
    const panelW = estimatePanelWidth()
    return { width: panelW, height: 280 + avatar + 16 }
  }
  if (isExpanded) {
    const bubbleW = estimateBubbleWidth()
    return {
      width: Math.max(bubbleW, avatar),
      height: avatar + 140,
    }
  }
  return { width: avatar, height: avatar }
}

export function BabyCeoCompanion({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const tasks = useCompanionTasks(userId)
  const notifications = useCompanionNotifications(userId)
  const [panelOpen, setPanelOpen] = useState(false)

  const reducedMotion = usePrefersReducedMotion()
  const { position, isDragging, onPointerDown, onPointerMove, endDrag } = useCompanionDrag()

  const {
    active,
    panelReactions,
    displayMood,
    dismissReaction,
    peekIdleQuiet,
    celebration,
    celebrating,
  } = useBabyCeoReactions(tasks, notifications, userId)

  const dailyMotivation = useDailyMotivation(userId)
  const moodAllowsMotivation =
    displayMood === 'idle' || displayMood === 'relaxed'
  const showDailyMotivation =
    dailyMotivation.visible &&
    moodAllowsMotivation &&
    !panelOpen &&
    !active &&
    !celebrating

  const hasCompactAlert = Boolean(active) && !panelOpen
  const isExpanded =
    panelOpen || hasCompactAlert || showDailyMotivation || celebrating

  const runCta = useCallback(
    async (reaction: CompanionReaction) => {
      if (!reaction.to) return
      if (reaction.notificationId) {
        try {
          await markNotificationRead(reaction.notificationId)
        } catch {
          /* navigate anyway */
        }
      }
      dismissReaction(reaction.id)
      navigate(reaction.to)
      setPanelOpen(false)
    },
    [dismissReaction, navigate],
  )

  const openPanel = () => {
    peekIdleQuiet()
    setPanelOpen(true)
  }

  const minimizePanel = () => {
    setPanelOpen(false)
  }

  const handleCharacterPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const dragged = endDrag(e)
    if (dragged) return
    if (panelOpen) {
      setPanelOpen(false)
      return
    }
    if (!hasCompactAlert && !showDailyMotivation) {
      openPanel()
    }
  }

  if (tasks === null || notifications === null) return null

  const animClass = moodAnimationClass(
    displayMood,
    celebrating,
    celebration.phase,
    celebration.variant,
    reducedMotion,
  )
  const fabAnimClass =
    showDailyMotivation && !celebrating && !reducedMotion
      ? 'companion-bounce'
      : isExpanded
        ? animClass
        : !reducedMotion
          ? 'companion-float'
          : ''

  const cluster = estimateClusterSize(panelOpen, isExpanded)
  const anchor =
    typeof window !== 'undefined'
      ? clampAnchorPosition(position, cluster.width, cluster.height)
      : position

  return (
    <div
      className="pointer-events-none fixed z-[45]"
      style={{ right: anchor.right, bottom: anchor.bottom }}
      aria-live="polite"
    >
      <div
        className={cn(
          'flex w-max max-w-[min(19rem,calc(100vw-1rem))] flex-col items-end gap-2',
        )}
      >
        {panelOpen ? (
          <div
            className="pointer-events-auto w-[min(19rem,calc(100vw-1.5rem))] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-[var(--color-foreground)] shadow-lg"
            role="dialog"
            aria-label="Boss baby companion"
          >
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-[var(--color-border)]/60 pb-2">
              <p className="text-xs font-semibold text-[var(--color-primary)]">Boss baby</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-md p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
                  aria-label="Minimize companion"
                  onClick={minimizePanel}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-md p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
                  aria-label="Close panel"
                  onClick={() => setPanelOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
              {panelReactions.length === 0 ? (
                <li className="text-xs text-[var(--color-muted-foreground)]">
                  No reactions right now. Important updates still appear in Notifications.
                </li>
              ) : (
                panelReactions.map((reaction) => (
                  <ReactionCard
                    key={reaction.id}
                    reaction={reaction}
                    celebrate={reaction.kind === 'celebrate'}
                    onDismiss={() => dismissReaction(reaction.id)}
                    onCta={() => void runCta(reaction)}
                    isActive={reaction.id === active?.id}
                  />
                ))
              )}
            </ul>
          </div>
        ) : null}

        {isExpanded && showDailyMotivation ? (
          <DailyMotivationBubble
            quote={dailyMotivation.quote}
            onDismiss={dailyMotivation.dismiss}
          />
        ) : null}

        {isExpanded && hasCompactAlert && active ? (
          <div className="pointer-events-auto">
            <ReactionCard
              compact
              reaction={active}
              celebrate={active.kind === 'celebrate'}
              onDismiss={() => dismissReaction(active.id)}
              onCta={() => void runCta(active)}
            />
          </div>
        ) : null}

        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={handleCharacterPointerUp}
          onPointerCancel={(e) => endDrag(e)}
          style={{ touchAction: isDragging ? 'none' : 'manipulation' }}
          className={cn(
            'pointer-events-auto relative flex cursor-grab items-center justify-center overflow-visible rounded-full border-2 border-[var(--color-primary-border)] bg-[var(--color-active-nav)]/50 shadow-lg active:cursor-grabbing',
            !reducedMotion && 'companion-size-transition',
            isExpanded ? 'h-[5rem] w-[5rem]' : 'h-14 w-14',
            isDragging && 'scale-[1.02]',
            celebrating && !reducedMotion && 'companion-celebrate-glow',
            fabAnimClass,
          )}
          aria-label={
            panelOpen
              ? 'Close companion panel'
              : isExpanded
                ? 'Boss baby companion'
                : 'Boss baby — drag or tap to open'
          }
        >
          {isExpanded && celebrating && !reducedMotion ? (
            <div className="pointer-events-none absolute -inset-10 z-[1] h-[calc(100%+5rem)] w-[calc(100%+5rem)]">
              <CelebrationBurst active={celebration.showParticles} />
            </div>
          ) : null}
          {isExpanded && celebrating ? (
            <CelebrationSparkles active={celebration.showSparkles && !reducedMotion} />
          ) : null}
          <div
            className={cn(
              'relative overflow-hidden rounded-full drop-shadow-[0_4px_14px_rgba(42,26,48,0.35)]',
              !reducedMotion && 'companion-size-transition',
              isExpanded ? 'h-[4.65rem] w-[4.65rem]' : 'h-12 w-12',
            )}
          >
            <BabyCeoCharacter
              mood={displayMood}
              celebratePhase={celebrating ? celebration.phase : 'idle'}
              celebrateVariant={celebration.variant}
              encouraging={showDailyMotivation}
            />
          </div>
        </button>
      </div>
    </div>
  )
}

function moodAnimationClass(
  mood: CompanionMood,
  celebrating: boolean,
  phase: CelebrationPhase,
  variant: number,
  reducedMotion: boolean,
): string {
  if (celebrating && phase !== 'idle') {
    if (reducedMotion) return 'companion-celebrate-static'
    if (phase === 'anticipate') return 'companion-celebrate-anticipate'
    if (phase === 'burst') return 'companion-celebrate-jump'
    if (phase === 'dance') {
      if (variant === 2) return 'companion-celebrate-spin'
      if (variant === 1) return 'companion-celebrate-dance'
      return 'companion-celebrate-jump'
    }
    if (phase === 'pose' || phase === 'wind-down') return 'companion-celebrate-pose'
  }

  switch (mood) {
    case 'celebrate':
      return reducedMotion ? 'companion-celebrate-static' : 'companion-celebrate-dance'
    case 'assigned':
      return 'companion-nod'
    case 'concerned':
      return 'companion-concern'
    case 'overdue':
      return 'companion-overdue'
    case 'relaxed':
      return 'companion-sleepy'
    default:
      return 'companion-float'
  }
}

function ReactionCard({
  reaction,
  compact,
  isActive,
  celebrate,
  onDismiss,
  onCta,
}: {
  reaction: CompanionReaction
  compact?: boolean
  isActive?: boolean
  celebrate?: boolean
  onDismiss: () => void
  onCta: () => void
}) {
  const shell = compact
    ? cn(
        'max-w-[17rem] rounded-2xl rounded-br-md border p-2.5 shadow-md',
        celebrate
          ? 'border-[#d4af37]/55 bg-gradient-to-br from-[var(--color-card)] via-[#f8f6ef] to-[var(--color-active-nav)]/40 shadow-[0_8px_24px_rgba(162,28,175,0.22)]'
          : 'border-[var(--color-border)] bg-[var(--color-card)]',
      )
    : cn(
        'rounded-lg border bg-[var(--color-muted)]/20 p-2.5',
        celebrate &&
          'border-[#d4af37]/45 bg-gradient-to-br from-[var(--color-card)] to-[var(--color-active-nav)]/30',
        isActive ? 'border-[var(--color-primary)]/40' : 'border-[var(--color-border)]/70',
      )

  return (
    <li className={cn(!compact && 'list-none')}>
      <div className={shell}>
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'font-semibold uppercase tracking-wide text-[var(--color-primary)]',
                celebrate ? 'text-[11px]' : 'text-[10px]',
              )}
            >
              {reaction.heading}
            </p>
            <p className="mt-0.5 text-xs font-medium leading-snug text-[var(--color-foreground)]">
              {reaction.body}
            </p>
            {reaction.detail ? (
              <p
                className={cn(
                  'mt-0.5 text-[var(--color-muted-foreground)]',
                  celebrate ? 'text-[11px] font-semibold text-[var(--color-foreground)]' : 'text-[10px]',
                )}
              >
                {reaction.detail}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
            aria-label="Dismiss companion message"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {reaction.ctaLabel && reaction.to ? (
          <Button
            type="button"
            size="sm"
            className="mt-2 h-7 w-full text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onCta()
            }}
          >
            {reaction.ctaLabel}
          </Button>
        ) : null}
      </div>
    </li>
  )
}
