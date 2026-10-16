import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Sticky action bar above the mobile bottom tab bar. */
export function MobileFormFooter({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 p-3 backdrop-blur-md sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none',
        className,
      )}
    >
      {children}
    </div>
  )
}
