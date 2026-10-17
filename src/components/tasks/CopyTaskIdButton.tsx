import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CopyTaskIdButton({
  taskId,
  className,
}: {
  taskId: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(taskId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('h-7 gap-1 px-2 font-mono text-xs', className)}
      onClick={() => void copy()}
    >
      <span>{taskId}</span>
      {copied ? (
        <Check className="h-3 w-3 text-success" aria-hidden />
      ) : (
        <Copy className="h-3 w-3 opacity-60" aria-hidden />
      )}
    </Button>
  )
}
