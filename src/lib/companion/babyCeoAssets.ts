import type { CelebrationPhase } from '@/hooks/useCelebrationSequence'
import type { CompanionMood } from '@/lib/companion/companionStats'

export type BabyCeoPoseKey = 'idle' | 'assigned' | 'concerned' | 'overdue' | 'celebrate'

/** Pre-rendered 3D character poses (raster), committed under /public/companion. */
export const BABY_CEO_IMAGES: Record<BabyCeoPoseKey, string> = {
  idle: '/companion/baby-ceo-idle.jpg',
  assigned: '/companion/baby-ceo-assigned.jpg',
  concerned: '/companion/baby-ceo-concerned.jpg',
  overdue: '/companion/baby-ceo-overdue.jpg',
  celebrate: '/companion/baby-ceo-celebrate.jpg',
}

export function pickBabyCeoPose(
  mood: CompanionMood,
  celebratePhase: CelebrationPhase,
  encouraging = false,
): BabyCeoPoseKey {
  const inCelebration = mood === 'celebrate' && celebratePhase !== 'idle'
  if (inCelebration || mood === 'celebrate') return 'celebrate'
  if (encouraging && (mood === 'idle' || mood === 'relaxed')) return 'assigned'
  switch (mood) {
    case 'assigned':
      return 'assigned'
    case 'concerned':
      return 'concerned'
    case 'overdue':
      return 'overdue'
    case 'relaxed':
      return 'idle'
    default:
      return 'idle'
  }
}
