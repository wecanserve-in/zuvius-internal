import { cn } from '@/lib/utils'

const SPOTS = [
  { top: '8%', left: '12%', delay: '0s', size: '0.45rem' },
  { top: '18%', right: '6%', delay: '0.15s', size: '0.35rem' },
  { top: '42%', left: '4%', delay: '0.3s', size: '0.5rem' },
  { top: '55%', right: '10%', delay: '0.05s', size: '0.4rem' },
  { top: '28%', left: '48%', delay: '0.22s', size: '0.3rem' },
]

export function CelebrationSparkles({ active, className }: { active: boolean; className?: string }) {
  if (!active) return null
  return (
    <div className={cn('pointer-events-none absolute -inset-3', className)} aria-hidden>
      {SPOTS.map((s, i) => (
        <span
          key={i}
          className="companion-sparkle absolute rounded-full bg-[#d4af37]"
          style={{
            top: s.top,
            left: s.left,
            right: s.right,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  )
}
