import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useGoBack } from '@/lib/navigation/useGoBack'
import { cn } from '@/lib/utils'

export function BackButton({
  fallback = '/',
  label,
  className,
  size = 'sm',
  variant = 'ghost',
}: {
  fallback?: string
  label?: ReactNode
  className?: string
  size?: 'sm' | 'default' | 'icon'
  variant?: 'ghost' | 'outline'
}) {
  const goBack = useGoBack(fallback)

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(label ? 'h-8 px-2' : 'h-8 w-8 px-0', className)}
      onClick={() => goBack()}
    >
      <ArrowLeft className={cn('h-3.5 w-3.5', label ? 'mr-1' : '')} />
      {label}
    </Button>
  )
}
