import { useEffect, useMemo, useState } from 'react'

export type CelebrationPhase =
  | 'idle'
  | 'anticipate'
  | 'burst'
  | 'dance'
  | 'pose'
  | 'wind-down'

function variantFromSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % 3
}

/** Timed celebration phases for task-completion reactions (~4s main sequence). */
export function useCelebrationSequence(active: boolean, reactionKey: string | undefined) {
  const [phase, setPhase] = useState<CelebrationPhase>('idle')
  const variant = useMemo(
    () => (reactionKey ? variantFromSeed(reactionKey) : 0),
    [reactionKey],
  )

  useEffect(() => {
    if (!active || !reactionKey) {
      setPhase('idle')
      return
    }

    setPhase('anticipate')
    const t1 = window.setTimeout(() => setPhase('burst'), 180)
    const t2 = window.setTimeout(() => setPhase('dance'), 420)
    const t3 = window.setTimeout(() => setPhase('pose'), 2600)
    const t4 = window.setTimeout(() => setPhase('wind-down'), 3600)
    const t5 = window.setTimeout(() => setPhase('idle'), 4200)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
      window.clearTimeout(t5)
    }
  }, [active, reactionKey])

  const showParticles =
    phase === 'burst' || phase === 'dance' || phase === 'pose'

  const showSparkles = phase !== 'idle' && phase !== 'wind-down'

  return { phase, variant, showParticles, showSparkles }
}
