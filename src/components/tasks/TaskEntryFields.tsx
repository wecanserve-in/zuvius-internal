import { AssigneeSelector } from '@/components/tasks/AssigneeSelector'
import { DueDateTimeField } from '@/components/tasks/DueDateTimeField'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatUserRole } from '@/lib/permissions'
import { departmentLabelForUser } from '@/lib/tasks/orgDirectory'
import type { AppUser, Department } from '@/types'

const selectClass =
  'flex h-9 w-full rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-2 text-sm'

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
}) {
  const selectedAssignees = assigneeIds
    .map((id) => orgMembers.find((u) => u.id === id))
    .filter(Boolean) as AppUser[]

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_minmax(14rem,18rem)] lg:items-start">
      <div className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor="task-body">Task</Label>
          <Textarea
            id="task-body"
            rows={4}
            className="min-h-[5rem] resize-y text-sm"
            placeholder="What needs to be done?"
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            disabled={disabled}
          />
          {bodyError ? <p className="text-xs text-red-600">{bodyError}</p> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(7.5rem,9rem)_1fr] sm:items-start">
          <div className="space-y-1">
            <Label htmlFor="priority" className="text-xs">Priority</Label>
            <select
              id="priority"
              className={selectClass}
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
          />
        </div>
        {onAttachmentsChange ? (
          <div className="space-y-1">
            <Label htmlFor="attachments" className="text-xs">Attachments (optional)</Label>
            <Input
              id="attachments"
              type="file"
              multiple
              className="h-9 text-xs"
              onChange={(e) => onAttachmentsChange(Array.from(e.target.files ?? []))}
              disabled={disabled}
            />
            {attachments?.length ? (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {attachments.length} file(s) selected
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3">
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
        />
        {selectedAssignees.length > 0 ? (
          <ul className="space-y-0.5 text-xs text-[var(--color-muted-foreground)]">
            {selectedAssignees.map((u) => (
              <li key={u.id}>
                {u.displayName} · {departmentLabelForUser(u, deptById)} · {formatUserRole(u.role)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
