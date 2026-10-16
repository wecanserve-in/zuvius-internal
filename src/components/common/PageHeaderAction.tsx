import type { LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Primary page action: round + on phone, full label from `sm` up. */
export function PageHeaderAction({
  label,
  onClick,
  disabled,
  icon: Icon = Plus,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  icon?: LucideIcon
}) {
  return (
    <>
      <Button
        type="button"
        size="icon"
        className="h-9 w-9 shrink-0 rounded-full sm:hidden"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        size="sm"
        className="hidden shrink-0 whitespace-nowrap sm:inline-flex"
        onClick={onClick}
        disabled={disabled}
      >
        {label}
      </Button>
    </>
  )
}
