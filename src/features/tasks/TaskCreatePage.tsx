import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AssigneeSelector } from '@/components/tasks/AssigneeSelector'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/AuthContext'
import { canCreateTasks, formatUserRole } from '@/lib/permissions'
import { departmentLabelForUser, filterAssigneeCandidates } from '@/lib/tasks/orgDirectory'
import { taskFormSchema, type TaskFormValues } from '@/lib/validation/task'
import { listDepartments } from '@/services/departments.service'
import { createTask } from '@/services/tasks.service'
import { getUserById, listOrgTaskMemberCandidates } from '@/services/users.service'
import type { AppUser, Department } from '@/types'

export function TaskCreatePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState<Department[]>([])
  const [orgMembers, setOrgMembers] = useState<AppUser[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      assigneeIds: [],
      priority: 'medium',
      requiresReview: false,
      departmentId: '',
    },
  })

  const assigneeIds = form.watch('assigneeIds')

  const loadMembers = () => {
    if (!profile) return
    setMembersLoading(true)
    setMembersError(null)
    void listOrgTaskMemberCandidates(profile)
      .then((users) => {
        setOrgMembers(filterAssigneeCandidates(profile, users))
        setMembersError(null)
      })
      .catch((err) => {
        setOrgMembers([])
        setMembersError(err instanceof Error ? err.message : 'Could not load employees')
      })
      .finally(() => setMembersLoading(false))
  }

  useEffect(() => {
    void listDepartments().then(setDepartments)
  }, [])

  useEffect(() => {
    loadMembers()
  }, [profile?.id])

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])

  const selectedAssignees = useMemo(
    () =>
      assigneeIds
        .map((id) => orgMembers.find((u) => u.id === id))
        .filter(Boolean) as AppUser[],
    [assigneeIds, orgMembers],
  )

  if (!profile || !canCreateTasks(profile)) {
    return <Navigate to="/tasks" replace />
  }

  const resolveDepartmentId = (assignees: AppUser[]): string => {
    const first = assignees[0]
    if (!first) throw new Error('Select at least one assignee')
    const dept =
      first.departmentIds[0] ??
      profile.departmentIds[0] ??
      departments[0]?.id
    if (!dept) throw new Error('Could not determine task department')
    return dept
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setSubmitting(true)
    try {
      const assigneeProfiles: AppUser[] = []
      for (const id of values.assigneeIds) {
        const u = await getUserById(id)
        if (u) assigneeProfiles.push(u)
      }
      const departmentId = resolveDepartmentId(assigneeProfiles)

      const id = await createTask(
        profile,
        {
          title: values.title,
          description: values.description,
          departmentId,
          assigneeIds: values.assigneeIds,
          priority: values.priority,
          deadlineAt: values.deadlineAt ? new Date(values.deadlineAt) : undefined,
          requiresReview: values.requiresReview,
        },
        { files: attachments },
      )
      navigate(`/tasks/${id}`, { state: { taskCreated: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  })

  const selectClass =
    'flex h-10 w-full rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-sm'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title="Create task"
        description="Assign work to any active colleague across the organisation."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register('title')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} {...form.register('description')} />
            </div>
            <AssigneeSelector
              options={orgMembers}
              value={assigneeIds}
              onChange={(ids) => form.setValue('assigneeIds', ids)}
              loading={membersLoading}
              loadError={membersError}
              onRetry={loadMembers}
              emptyLabel="No eligible employees found."
              departmentLabelForUser={(u) => departmentLabelForUser(u, deptById)}
            />
            {selectedAssignees.length > 0 ? (
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2 text-sm">
                <p className="font-medium text-[var(--color-foreground)]">Selected assignees</p>
                <ul className="mt-1 space-y-1 text-[var(--color-muted-foreground)]">
                  {selectedAssignees.map((u) => (
                    <li key={u.id}>
                      {u.displayName} — {departmentLabelForUser(u, deptById)} ·{' '}
                      {formatUserRole(u.role)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="priority">Priority</Label>
                <select id="priority" className={selectClass} {...form.register('priority')}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="deadline">Due date</Label>
                <Input id="deadline" type="datetime-local" {...form.register('deadlineAt')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="attachments">Attachments (optional)</Label>
              <Input
                id="attachments"
                type="file"
                multiple
                onChange={(e) => setAttachments(Array.from(e.target.files ?? []))}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create task'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/tasks">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
