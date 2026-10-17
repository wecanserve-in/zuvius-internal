import { useEffect, useState } from 'react'
import type { CelebrationPhase } from '@/hooks/useCelebrationSequence'
import { BABY_CEO_IMAGES, pickBabyCeoPose } from '@/lib/companion/babyCeoAssets'
import type { CompanionMood } from '@/lib/companion/companionStats'
import { cn } from '@/lib/utils'

/**
 * Renders pre-rendered 3D-style Baby CEO pose images (not a real-time GLB).
 * Poses share the same character design; celebration uses a dedicated victory render.
 */
export function BabyCeoCharacter({
  mood,
  celebratePhase = 'idle',
  encouraging = false,
  className,
}: {
  mood: CompanionMood
  celebratePhase?: CelebrationPhase
  celebrateVariant?: number
  encouraging?: boolean
  className?: string
}) {
  const pose = pickBabyCeoPose(mood, celebratePhase, encouraging)
  const [loadedPose, setLoadedPose] = useState(pose)

  useEffect(() => {
    if (pose === loadedPose) return
    const img = new Image()
    img.src = BABY_CEO_IMAGES[pose]
    const apply = () => setLoadedPose(pose)
    img.onload = apply
    img.onerror = apply
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [pose, loadedPose])

  useEffect(() => {
    const preload = [BABY_CEO_IMAGES.celebrate, BABY_CEO_IMAGES.assigned]
    for (const src of preload) {
      const img = new Image()
      img.src = src
    }
  }, [])

  const src = BABY_CEO_IMAGES[loadedPose]

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      decoding="async"
      className={cn(
        'h-full w-full select-none object-cover',
        'object-[center_18%]',
        className,
      )}
      aria-hidden
    />
  )
}
