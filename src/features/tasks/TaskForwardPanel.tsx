import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ForwardRecipientSelector } from '@/components/tasks/ForwardRecipientSelector'
import { canLoadForwardRecipientDirectory } from '@/lib/permissions/forwarding'
import { departmentLabelForUser } from '@/lib/tasks/orgDirectory'
import { listEligibleForwardTargets, validateHandoverNote } from '@/lib/tasks/handover'
import { formatUserRole } from '@/lib/permissions'
import { forwardTask } from '@/services/tasks.service'
import { listForwardRecipientCandidates } from '@/services/users.service'
import type { AppUser, Department, Task } from '@/types'

export function TaskForwardPanel({
  task,
  actor,
  departments,
  onDone,
  onCancel,
}: {
  task: Task
  actor: AppUser
  departments: Department[]
  usersById?: Map<string, AppUser>
  onDone: () => void
  onCancel: () => void
}) {
  const idempotencyKeyRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${actor.id}`,
  )
  const [targetId, setTargetId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [recipients, setRecipients] = useState<AppUser[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const deptById = useMemo(
    () => new Map(departments.map((d) => [d.id, d])),
    [departments],
  )

  const loadRecipients = useCallback(async () => {
    if (!canLoadForwardRecipientDirectory(actor, task)) {
      setLoadError('You cannot forward this task.')
      setRecipients([])
      setLoadingRecipients(false)
      return
    }
    setLoadingRecipients(true)
    setLoadError(null)
    try {
      const users = await listForwardRecipientCandidates(actor, {
        taskDepartmentId: task.departmentId,
      })
      setRecipients(listEligibleForwardTargets(actor, task, users))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load employees')
      setRecipients([])
    } finally {
      setLoadingRecipients(false)
    }
  }, [actor, task])

  useEffect(() => {
    void loadRecipients()
  }, [loadRecipients])

  const selected = targetId ? recipients.find((u) => u.id === targetId) : undefined

  const requestConfirm = () => {
    setError(null)
    if (!targetId) {
      setError('Select who should receive this task.')
      return
    }
    try {
      validateHandoverNote(note)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Handover note is required.')
      return
    }
    setConfirmOpen(true)
  }

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await forwardTask(actor, task.id, targetId, note, idempotencyKeyRef.current)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Handover failed')
      setConfirmOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const deptLabel = (u: AppUser) =>
    u.departmentIds.map((id) => deptById.get(id)?.name ?? id).join(', ') || 'No department'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-lg"
        role="dialog"
        aria-labelledby="forward-task-title"
      >
        {confirmOpen && selected ? (
          <>
            <h2 id="forward-task-title" className="text-lg font-semibold">Confirm handover</h2>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">Task: {task.title}</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs text-[var(--color-muted-foreground)]">Forwarding from</p>
                <p className="font-medium">{actor.displayName}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {departmentLabelForUser(actor, deptById)} · {formatUserRole(actor.role)}
                </p>
              </div>
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs text-[var(--color-muted-foreground)]">Forwarding to</p>
                <p className="font-medium">{selected.displayName}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {deptLabel(selected)} · {formatUserRole(selected.role)}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Label>Handover note</Label>
              <p className="mt-1 whitespace-pre-wrap text-sm">{note.trim()}</p>
            </div>
            {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
              >
                Back
              </Button>
              <Button type="button" disabled={submitting} onClick={() => void submit()}>
                {submitting ? 'Saving…' : 'Confirm handover'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 id="forward-task-title" className="text-lg font-semibold">Forward task</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Hand over &quot;{task.title}&quot; to a colleague anywhere in the organisation.
              Your handover note is required.
            </p>
            <div className="mt-4 space-y-3">
              <ForwardRecipientSelector
                options={recipients}
                value={targetId}
                onChange={setTargetId}
                loading={loadingRecipients}
                loadError={loadError}
                onRetry={() => void loadRecipients()}
                deptById={deptById}
                disabled={submitting}
              />
              <div className="space-y-1">
                <Label htmlFor="handover-note">Handover note</Label>
                <Textarea
                  id="handover-note"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What you finished, what remains, and why you are forwarding…"
                />
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" disabled={submitting} onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="button" disabled={submitting || loadingRecipients} onClick={requestConfirm}>
                  Review handover
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
