import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { isTaskPending, updateAssigneeProgress } from '@/services/tasks.service'
import type { AppUser, Task } from '@/types'

export function TaskQuickCompleteButton({
  task,
  actor,
  className,
  size = 'md',
}: {
  task: Task
  actor: AppUser
  className?: string
  size?: 'sm' | 'md'
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canComplete =
    task.assigneeIds.includes(actor.id) && isTaskPending(task)

  if (!canComplete) return null

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      await updateAssigneeProgress(actor, task.id, 100, 'completed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete task')
    } finally {
      setLoading(false)
    }
  }

  const dim = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <button
      type="button"
      title={error ?? 'Mark complete'}
      aria-label={`Mark "${task.title}" complete`}
      disabled={loading}
      onClick={handleClick}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        dim,
        'border-2 border-[var(--color-primary)]/35 bg-[var(--color-card)] text-[var(--color-primary)]',
        'shadow-[0_1px_2px_rgba(42,26,48,0.06)]',
        'transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 focus-visible:ring-offset-1',
        error && 'border-danger/50 text-danger hover:border-danger hover:bg-danger/10 hover:text-danger',
        loading && 'opacity-70',
        className,
      )}
    >
      {loading ? (
        <Loader2 className={cn(icon, 'animate-spin')} aria-hidden />
      ) : (
        <Check className={icon} strokeWidth={2.75} aria-hidden />
      )}
    </button>
  )
}
