import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/features/auth/AuthContext'
import { canManageUsers, formatUserRole } from '@/lib/permissions'
import { subscribeDepartments } from '@/services/departments.service'
import { syncUserDepartmentChannels } from '@/services/conversations.service'
import {
  createEmployeeComplete,
  listActiveUsers,
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
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('member')
  const [departmentId, setDepartmentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

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

  const refreshUsers = () => {
    void listActiveUsers()
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
        password,
        displayName,
        role,
        departmentIds,
      })
      const names = new Map(departments.map((d) => [d.id, d.name]))
      await syncUserDepartmentChannels(profile, departmentIds, names)
      setSuccess(`${displayName} was created. They can sign in with the email and password you set.`)
      setDisplayName('')
      setEmail('')
      setPassword('')
      setRole('member')
      setDepartmentId('')
      refreshUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        compact
        title="Team"
        description="Employees and access"
        action={
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close form' : 'Create employee'}
          </Button>
        }
      />

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="max-w-xl space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4"
        >
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Work email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
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
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {success ? <p className="text-sm text-green-700">{success}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Save employee'}
          </Button>
        </form>
      ) : null}

      {listError ? <p className="text-sm text-red-600">{listError}</p> : null}

      <Input
        placeholder="Search employees…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Table>
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
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/team/${u.id}`}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
