import { CheckSquare, FolderKanban } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function CreateWorkSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const close = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create work</DialogTitle>
          <DialogDescription>Start a project or assign a standalone task.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Link
            to="/projects/new"
            onClick={close}
            className="flex min-h-[3.25rem] items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-3 active:bg-[var(--color-muted)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-project-muted)] text-[var(--color-project-foreground)]">
              <FolderKanban className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold">Create project</span>
              <span className="block text-xs text-[var(--color-muted-foreground)]">
                Group related tasks with shared progress
              </span>
            </span>
          </Link>
          <Link
            to="/tasks/new"
            onClick={close}
            className="flex min-h-[3.25rem] items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-3 active:bg-[var(--color-muted)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)]">
              <CheckSquare className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold">Create task</span>
              <span className="block text-xs text-[var(--color-muted-foreground)]">
                Assign work to any colleague
              </span>
            </span>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
