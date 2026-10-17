import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  action,
  className,
  compact,
  actionBesideTitle,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  compact?: boolean
  /** Keep the action on the same row as the title (all breakpoints). */
  actionBesideTitle?: boolean
}) {
  const actionNode = action ? (
    <div className="flex shrink-0 items-center">{action}</div>
  ) : null

  return (
    <div
      className={cn(
        actionBesideTitle
          ? 'flex flex-col gap-2'
          : 'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3',
        compact ? 'mb-1' : 'mb-4',
        className,
      )}
    >
      <div className={cn('min-w-0', actionBesideTitle ? 'w-fit max-w-full' : 'flex-1')}>
        <div
          className={cn(
            'flex items-center',
            actionBesideTitle ? 'w-fit max-w-full gap-1.5' : 'gap-2',
          )}
        >
          <h2
            className={cn(
              'min-w-0 font-semibold tracking-tight break-words',
              !actionBesideTitle && 'flex-1',
              compact ? 'text-base' : 'text-lg sm:text-xl',
            )}
          >
            {title}
          </h2>
          {actionBesideTitle ? actionNode : action ? (
            <div className="flex shrink-0 items-center sm:hidden">{action}</div>
          ) : null}
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
      {action && !actionBesideTitle ? (
        <div className="hidden shrink-0 items-center justify-end sm:flex">{action}</div>
      ) : null}
    </div>
  )
}
