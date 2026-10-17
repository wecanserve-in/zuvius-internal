import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DailyMotivationBubble({
  quote,
  onDismiss,
  className,
}: {
  quote: string
  onDismiss: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'pointer-events-auto relative max-w-[14.5rem] rounded-2xl rounded-br-sm border border-[var(--color-primary)]/25 bg-gradient-to-br from-[var(--color-card)] to-[var(--color-active-nav)]/55 px-3 py-2.5 text-[var(--color-foreground)] shadow-md',
        className,
      )}
      role="status"
      aria-label="Daily motivation"
    >
      <p className="pr-5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
        Daily boost
      </p>
      <p className="mt-1 text-xs leading-snug text-[var(--color-foreground)]">{quote}</p>
      <button
        type="button"
        className="absolute right-1.5 top-1.5 rounded p-0.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/80"
        aria-label="Dismiss daily quote"
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <span
        className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-b border-r border-[var(--color-primary)]/25 bg-[var(--color-active-nav)]/55"
        aria-hidden
      />
    </div>
  )
}
