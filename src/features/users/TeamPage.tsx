import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
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
import { DEFAULT_TEMP_PASSWORD } from '@/lib/auth/passwordPolicy'
import { sendWelcomeEmail } from '@/services/welcomeEmail.service'
import { TeamMobileList } from '@/components/users/TeamMobileList'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/features/auth/AuthContext'
import { canEditEmployeeAccount, canManageUsers, formatUserRole } from '@/lib/permissions'
import { subscribeDepartments } from '@/services/departments.service'
import { syncUserDepartmentChannels } from '@/services/conversations.service'
import {
  createEmployeeComplete,
  listActiveUsers,
  listAllUsers,
  syncDepartmentRostersForAdmin,
} from '@/services/users.service'
import type { AppUser, Department, UserRole } from '@/types'

const ROLES: UserRole[] = ['member', 'department_admin', 'admin', 'super_admin']

export function TeamPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [listError, setListError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('member')
  const [departmentId, setDepartmentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [emailing, setEmailing] = useState<string | null>(null)

  const resendLoginEmail = async (u: AppUser) => {
    setEmailing(u.id)
    setError(null)
    const problem = await sendWelcomeEmail(u.email)
    setEmailing(null)
    setSuccess(
      problem
        ? `Could not email ${u.displayName} (${problem}).`
        : `Login email sent to ${u.displayName} (${u.email}).`,
    )
  }

  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? '—'

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.includes(q),
    )
  }, [users, search])

  const refreshUsers = (includeInactive = showInactive) => {
    void (includeInactive ? listAllUsers() : listActiveUsers())
      .then(async (data) => {
        setUsers(data)
        setListError(null)
        if (profile) await syncDepartmentRostersForAdmin(profile).catch(() => undefined)
      })
      .catch((err) => {
        setListError(err instanceof Error ? err.message : 'Could not load team list')
      })
  }

  useEffect(() => {
    refreshUsers()
    return subscribeDepartments(setDepartments)
  }, [])

  if (!profile || !canManageUsers(profile)) {
    return <Navigate to="/" replace />
  }

  const resetForm = () => {
    setDisplayName('')
    setEmail('')
    setRole('member')
    setDepartmentId('')
    setError(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      if (!departmentId) {
        throw new Error('Select a department for this employee.')
      }
      const departmentIds = [departmentId]
      await createEmployeeComplete(profile, {
        email,
        displayName,
        role,
        departmentIds,
      })
      const names = new Map(departments.map((d) => [d.id, d.name]))
      await syncUserDepartmentChannels(profile, departmentIds, names)
      const createdName = displayName
      const createdEmail = email.trim()
      setSuccess(`${createdName} was created. Sending their login email…`)
      void sendWelcomeEmail(createdEmail).then((problem) => {
        setSuccess(
          problem
            ? `${createdName} was created, but the login email could not be sent (${problem}). Tell them: sign in with ${createdEmail} and temporary password ${DEFAULT_TEMP_PASSWORD}.`
            : `${createdName} was created and emailed their login details (${createdEmail}, temporary password ${DEFAULT_TEMP_PASSWORD}).`,
        )
      })
      resetForm()
      setFormOpen(false)
      refreshUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        compact
        title="Team"
        action={
          <PageHeaderAction label="Create employee" onClick={() => setFormOpen(true)} />
        }
      />

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create employee</DialogTitle>
            <DialogDescription>
              Add a colleague with name, email, role, and department.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Work email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="surface-info rounded-md px-3 py-2 text-sm">
              Temporary password: <span className="font-mono font-semibold">{DEFAULT_TEMP_PASSWORD}</span>
              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                We email this to them automatically. They must set their own password the first
                time they sign in.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                className="flex h-10 w-full rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                {ROLES.map((r) => (
                  <option
                    key={r}
                    value={r}
                    disabled={r === 'super_admin' && profile.role !== 'super_admin'}
                  >
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <select
                className="flex h-10 w-full rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-sm"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
                disabled={departments.length === 0}
              >
                <option value="">
                  {departments.length === 0 ? 'No departments — create one first' : 'Select department'}
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Save employee'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {success ? <p className="text-sm text-green-700">{success}</p> : null}
      {listError ? <p className="text-sm text-danger">{listError}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search employees…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => {
              setShowInactive(e.target.checked)
              refreshUsers(e.target.checked)
            }}
          />
          Show deactivated
        </label>
      </div>

      <TeamMobileList users={filteredUsers} deptName={deptName} />

      <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <p className="font-medium">{u.displayName}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{u.email}</p>
              </TableCell>
              <TableCell className="text-[var(--color-muted-foreground)]">
                {u.departmentIds.map(deptName).join(', ') || '—'}
              </TableCell>
              <TableCell className="capitalize">{formatUserRole(u.role)}</TableCell>
              <TableCell>{u.isActive ? 'Active' : 'Inactive'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {u.mustChangePassword && u.isActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={emailing === u.id}
                      title="Email their sign-in link and temporary password again"
                      onClick={() => void resendLoginEmail(u)}
                    >
                      {emailing === u.id ? 'Sending…' : 'Send login email'}
                    </Button>
                  ) : null}
                  {profile && canEditEmployeeAccount(profile, u) ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/team/${u.id}?edit=1`}>Edit</Link>
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/team/${u.id}`}>View</Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
