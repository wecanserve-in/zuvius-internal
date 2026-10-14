import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  action,
  className,
  compact,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2',
        compact ? 'mb-1' : 'mb-4 items-start gap-3',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className={cn('font-semibold tracking-tight', compact ? 'text-base' : 'text-lg')}>
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              'text-[var(--color-muted-foreground)]',
              compact ? 'text-xs leading-snug' : 'mt-0.5 text-sm',
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
