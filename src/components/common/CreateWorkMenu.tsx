import { CheckSquare, FolderKanban, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

/** Circular + menu: create project or task. */
export function CreateWorkMenu({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          className={cn(
            'h-9 w-9 shrink-0 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90',
            className,
          )}
          aria-label="Create project or task"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link to="/projects/new" className="flex w-full items-center gap-2">
            <FolderKanban className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
            Create project
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/tasks/new" className="flex w-full items-center gap-2">
            <CheckSquare className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
            Create task
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
