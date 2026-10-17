import { Paperclip, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useId } from 'react'
import { AssigneeSelector } from '@/components/tasks/AssigneeSelector'
import { DueDateTimeField } from '@/components/tasks/DueDateTimeField'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { departmentLabelForUser } from '@/lib/tasks/orgDirectory'
import type { AppUser, Department } from '@/types'
import { cn } from '@/lib/utils'

const selectClass =
  'flex h-8 rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-1.5 text-xs'

export function TaskEntryFields({
  body,
  onBodyChange,
  assigneeIds,
  onAssigneeIdsChange,
  priority,
  onPriorityChange,
  deadlineAt,
  onDeadlineChange,
  orgMembers,
  deptById,
  membersLoading,
  membersError,
  onRetryMembers,
  attachments,
  onAttachmentsChange,
  bodyError,
  disabled,
  compact = true,
  singleLine = false,
  actions,
}: {
  body: string
  onBodyChange: (v: string) => void
  assigneeIds: string[]
  onAssigneeIdsChange: (ids: string[]) => void
  priority: string
  onPriorityChange: (v: string) => void
  deadlineAt: string
  onDeadlineChange: (v: string) => void
  orgMembers: AppUser[]
  deptById: Map<string, Department>
  membersLoading?: boolean
  membersError?: string | null
  onRetryMembers?: () => void
  attachments?: File[]
  onAttachmentsChange?: (files: File[]) => void
  bodyError?: string
  disabled?: boolean
  compact?: boolean
  /** Desktop: one horizontal row (title, assignee, priority, due, files, actions). */
  singleLine?: boolean
  actions?: ReactNode
}) {
  const fileInputId = useId()
  const titleLine = body.split(/\r?\n/)[0] ?? body

  const setTitleLine = (title: string) => {
    const rest = body.split(/\r?\n/).slice(1).join('\n').trim()
    onBodyChange(rest ? `${title}\n${rest}` : title)
  }

  const removeAttachment = (index: number) => {
    if (!attachments || !onAttachmentsChange) return
    onAttachmentsChange(attachments.filter((_, i) => i !== index))
  }

  const attachmentCount = attachments?.length ?? 0

  if (singleLine) {
    return (
      <div className="space-y-2">
        <div
          className={cn(
            'flex flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:gap-1.5',
          )}
        >
          <Input
            id="task-title"
            className="h-8 min-w-0 flex-1 text-sm md:min-w-[6rem]"
            placeholder="What needs to be done?"
            value={titleLine}
            onChange={(e) => setTitleLine(e.target.value)}
            disabled={disabled}
          />
          <div className="min-w-0 md:w-[10rem] md:shrink-0">
            <AssigneeSelector
              options={orgMembers}
              value={assigneeIds}
              onChange={onAssigneeIdsChange}
              loading={membersLoading}
              loadError={membersError}
              onRetry={onRetryMembers}
              emptyLabel="No eligible employees found."
              departmentLabelForUser={(u) => departmentLabelForUser(u, deptById)}
              disabled={disabled}
              compact
              hideLabel
              singleLine
            />
          </div>
          <select
            id="priority"
            className={cn(selectClass, 'h-8 w-[5.25rem] shrink-0 capitalize')}
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            disabled={disabled}
            aria-label="Priority"
          >
            <option value="low">Low</option>
            <option value="medium">Med</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <DueDateTimeField
            value={deadlineAt}
            onChange={onDeadlineChange}
            disabled={disabled}
            inline
          />
          {onAttachmentsChange ? (
            <div className="relative shrink-0">
              <label
                htmlFor={fileInputId}
                className={cn(
                  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[var(--color-input)] bg-[var(--color-card)] hover:bg-[var(--color-muted)]/40',
                  disabled && 'pointer-events-none opacity-50',
                )}
                title={attachmentCount ? `${attachmentCount} file(s)` : 'Attach files'}
              >
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                {attachmentCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-0.5 text-[9px] font-medium text-white">
                    {attachmentCount}
                  </span>
                ) : null}
              </label>
              <input
                id={fileInputId}
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? [])
                  onAttachmentsChange([...(attachments ?? []), ...picked])
                  e.target.value = ''
                }}
                disabled={disabled}
              />
            </div>
          ) : null}
          {actions ? (
            <div className="flex shrink-0 items-center gap-2 md:ml-auto">{actions}</div>
          ) : null}
        </div>
        {bodyError ? <p className="text-xs text-danger">{bodyError}</p> : null}
        {attachments && attachments.length > 0 && onAttachmentsChange ? (
          <ul className="flex flex-wrap gap-1">
            {attachments.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="inline-flex max-w-full items-center gap-1 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px]"
              >
                <span className="max-w-[10rem] truncate">{file.name}</span>
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-[var(--color-muted)]"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeAttachment(index)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className={cn('grid gap-2', compact ? 'lg:grid-cols-[1fr_minmax(12rem,16rem)]' : undefined)}>
        <div className="space-y-1">
          <Label htmlFor="task-title" className="text-xs sr-only">Task</Label>
          <Input
            id="task-title"
            className="h-9 text-sm"
            placeholder="What needs to be done?"
            value={titleLine}
            onChange={(e) => setTitleLine(e.target.value)}
            disabled={disabled}
          />
          {bodyError ? <p className="text-xs text-danger">{bodyError}</p> : null}
        </div>
        <AssigneeSelector
          options={orgMembers}
          value={assigneeIds}
          onChange={onAssigneeIdsChange}
          loading={membersLoading}
          loadError={membersError}
          onRetry={onRetryMembers}
          emptyLabel="No eligible employees found."
          departmentLabelForUser={(u) => departmentLabelForUser(u, deptById)}
          disabled={disabled}
          compact
          hideLabel
        />
      </div>

      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <div className="space-y-1">
          <Label htmlFor="priority" className="text-xs">Priority</Label>
          <select
            id="priority"
            className={cn(selectClass, 'h-8 w-[6.5rem]')}
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            disabled={disabled}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <DueDateTimeField
          value={deadlineAt}
          onChange={onDeadlineChange}
          disabled={disabled}
          compact
        />
        {onAttachmentsChange ? (
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Paperclip className="h-3 w-3" aria-hidden />
              Files
            </Label>
            <Input
              id="attachments"
              type="file"
              multiple
              className="h-8 max-w-[11rem] text-xs"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? [])
                onAttachmentsChange([...(attachments ?? []), ...picked])
                e.target.value = ''
              }}
              disabled={disabled}
            />
          </div>
        ) : null}
      </div>

      {attachments && attachments.length > 0 && onAttachmentsChange ? (
        <ul className="flex flex-wrap gap-1.5">
          {attachments.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="inline-flex max-w-full items-center gap-1 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-xs"
            >
              <span className="truncate max-w-[12rem]">{file.name}</span>
              <button
                type="button"
                className="rounded p-0.5 hover:bg-[var(--color-muted)]"
                aria-label={`Remove ${file.name}`}
                onClick={() => removeAttachment(index)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
