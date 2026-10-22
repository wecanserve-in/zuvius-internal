import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { canChangeRole, formatUserRole } from '@/lib/permissions'
import { updateEmployeeProfile } from '@/services/users.service'
import type { AppUser, Department, UserRole } from '@/types'

const ROLES: UserRole[] = ['member', 'department_admin', 'admin', 'super_admin']

export function EmployeeAdminEditDialog({
  open,
  onOpenChange,
  actor,
  employee,
  departments,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  actor: AppUser
  employee: AppUser
  departments: Department[]
  onSaved: (updated: AppUser) => void
}) {
  const [role, setRole] = useState<UserRole>(employee.role)
  const [departmentId, setDepartmentId] = useState(employee.departmentIds[0] ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setRole(employee.role)
    setDepartmentId(employee.departmentIds[0] ?? '')
    setError(null)
  }, [open, employee])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (!departmentId) {
        throw new Error('Select a department.')
      }
      await updateEmployeeProfile(actor, employee.id, {
        role,
        departmentIds: [departmentId],
      })
      onSaved({
        ...employee,
        role,
        departmentIds: [departmentId],
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit employee</DialogTitle>
          <DialogDescription>
            Update role and department for {employee.displayName}. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">{employee.email}</p>
          <div className="space-y-2">
            <Label>Role</Label>
            <select
              className="flex h-10 w-full rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-sm capitalize"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {ROLES.map((r) => (
                <option
                  key={r}
                  value={r}
                  disabled={!canChangeRole(actor, r)}
                >
                  {formatUserRole(r)}
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
                {departments.length === 0 ? 'No departments' : 'Select department'}
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
