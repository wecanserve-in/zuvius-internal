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
        'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3',
        compact ? 'mb-1' : 'mb-4',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2
            className={cn(
              'min-w-0 flex-1 font-semibold tracking-tight break-words',
              compact ? 'text-base' : 'text-lg sm:text-xl',
            )}
          >
            {title}
          </h2>
          {action ? <div className="flex shrink-0 items-center sm:hidden">{action}</div> : null}
        </div>
        {description ? (
          <p
            className={cn(
              'text-[var(--color-muted-foreground)]',
              compact ? 'mt-0.5 text-xs leading-snug' : 'mt-0.5 text-sm',
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="hidden shrink-0 items-center justify-end sm:flex">{action}</div>
      ) : null}
    </div>
  )
}
