import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Centers page content with consistent max width and mobile-safe min-width. */
export function PageContainer({
  children,
  className,
  size = 'default',
}: {
  children: ReactNode
  className?: string
  size?: 'default' | 'narrow' | 'wide' | 'full'
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full min-w-0',
        size === 'narrow' && 'max-w-2xl',
        size === 'default' && 'max-w-6xl',
        size === 'wide' && 'max-w-7xl',
        size === 'full' && 'max-w-none',
        className,
      )}
    >
      {children}
    </div>
  )
}
