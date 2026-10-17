import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { PageHeaderAction } from '@/components/common/PageHeaderAction'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DepartmentMobileList } from '@/components/departments/DepartmentMobileList'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/features/auth/AuthContext'
import { canManageDepartments } from '@/lib/permissions'
import {
  createDepartmentRecord,
  reconcileDepartmentAdminIds,
  resolveDepartmentAdmins,
  subscribeDepartments,
} from '@/services/departments.service'
import { provisionDepartmentChannel } from '@/services/conversations.service'
import { isTaskPending, subscribeAllTasks } from '@/services/tasks.service'
import { listActiveUsers } from '@/services/users.service'
import type { AppUser, Department, Task } from '@/types'

export function DepartmentsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [openingChatDeptId, setOpeningChatDeptId] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => subscribeDepartments(setDepartments), [])
  useEffect(() => subscribeAllTasks(setTasks), [])

  useEffect(() => {
    void listActiveUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
  }, [])

  useEffect(() => {
    if (!profile || departments.length === 0 || users.length === 0) return
    void reconcileDepartmentAdminIds(profile, departments, users).catch(() => undefined)
  }, [profile, departments, users])

  const membersByDepartment = useMemo(() => {
    const map = new Map<string, number>()
    for (const u of users) {
      if (!u.isActive) continue
      for (const deptId of u.departmentIds) {
        map.set(deptId, (map.get(deptId) ?? 0) + 1)
      }
    }
    return map
  }, [users])

  const openTasksByDepartment = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tasks) {
      if (!t.departmentId || !isTaskPending(t)) continue
      map.set(t.departmentId, (map.get(t.departmentId) ?? 0) + 1)
    }
    return map
  }, [tasks])

  const filteredDepartments = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return departments
    return departments.filter((d) => d.name.toLowerCase().includes(q))
  }, [departments, search])

  if (!profile || !canManageDepartments(profile)) {
    return <Navigate to="/" replace />
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await createDepartmentRecord(profile, {
        name,
        description: description || undefined,
      })
      setName('')
      setDescription('')
      setCreateOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create department')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        compact
        title="Departments"
        action={
          <PageHeaderAction label="Add department" onClick={() => setCreateOpen(true)} />
        }
      />

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            setName('')
            setDescription('')
            setError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add department</DialogTitle>
            <DialogDescription>
              Create a department for grouping people and tasks.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name</Label>
              <Input
                id="dept-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Quality Assurance"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-desc">Description (optional)</Label>
              <Textarea
                id="dept-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Creating…' : 'Create department'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search departments…"
        className="w-full sm:max-w-sm"
      />

      <DepartmentMobileList
        departments={filteredDepartments}
        users={users}
        membersByDepartment={membersByDepartment}
        openTasksByDepartment={openTasksByDepartment}
        openingChatDeptId={openingChatDeptId}
        resolveAdmins={resolveDepartmentAdmins}
        onOpenChat={(d) => {
          if (!profile) return
          setOpeningChatDeptId(d.id)
          void provisionDepartmentChannel(profile, d)
            .then((conversationId) => navigate(`/messages/${conversationId}`))
            .catch((err) => {
              setError(err instanceof Error ? err.message : 'Could not open department chat')
            })
            .finally(() => setOpeningChatDeptId(null))
        }}
      />

      <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead>Department</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead className="text-right">Members</TableHead>
            <TableHead className="text-right">Open tasks</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDepartments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-[var(--color-muted-foreground)]">
                No departments found.
              </TableCell>
            </TableRow>
          ) : (
            filteredDepartments.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{d.name}</p>
                    {d.description ? (
                      <p className="text-xs text-[var(--color-muted-foreground)] line-clamp-1">
                        {d.description}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  {(() => {
                    const admins = resolveDepartmentAdmins(d, users)
                    if (admins.length === 0) {
                      return <span className="text-sm text-[var(--color-muted-foreground)]">—</span>
                    }
                    return (
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        {admins.map((u) => (
                          <Link
                            key={u.id}
                            to={`/team/${u.id}`}
                            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                          >
                            {u.displayName}
                          </Link>
                        ))}
                      </div>
                    )
                  })()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {membersByDepartment.get(d.id) ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {openTasksByDepartment.get(d.id) ?? 0}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={openingChatDeptId === d.id}
                    onClick={() => {
                      if (!profile) return
                      setOpeningChatDeptId(d.id)
                      void provisionDepartmentChannel(profile, d)
                        .then((conversationId) => navigate(`/messages/${conversationId}`))
                        .catch((err) => {
                          setError(
                            err instanceof Error ? err.message : 'Could not open department chat',
                          )
                        })
                        .finally(() => setOpeningChatDeptId(null))
                    }}
                  >
                    {openingChatDeptId === d.id ? 'Opening…' : 'Open chat'}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Assign people in Team. Department group chats stay in sync with membership.
      </p>
    </div>
  )
}
