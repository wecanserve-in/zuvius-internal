import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthContext'
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '@/lib/auth/passwordPolicy'

/**
 * New password + confirm. With `knownCurrentPassword` (first login: the temporary
 * password) the "current password" field is hidden.
 */
export function ChangePasswordForm({
  knownCurrentPassword,
  submitLabel = 'Change password',
  onDone,
}: {
  knownCurrentPassword?: string
  submitLabel?: string
  onDone?: () => void
}) {
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const problem = validateNewPassword(next, confirm)
    if (problem) {
      setError(problem)
      return
    }
    const currentPassword = knownCurrentPassword ?? current
    if (!currentPassword) {
      setError('Enter your current password.')
      return
    }
    if (currentPassword === next) {
      setError('The new password must be different from the current one.')
      return
    }
    setSaving(true)
    try {
      await changePassword(currentPassword, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setSuccess(true)
      onDone?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.')
    } finally {
      setSaving(false)
    }
  }

  const type = show ? 'text' : 'password'

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
      {knownCurrentPassword === undefined ? (
        <div className="space-y-1.5">
          <Label htmlFor="pw-current">Current password</Label>
          <Input
            id="pw-current"
            type={type}
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="pw-new">New password</Label>
        <div className="relative">
          <Input
            id="pw-new"
            type={type}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="pr-10"
            required
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
            aria-label={show ? 'Hide passwords' : 'Show passwords'}
            onClick={() => setShow((v) => !v)}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          At least {MIN_PASSWORD_LENGTH} characters, with a letter and a number.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pw-confirm">Confirm new password</Label>
        <Input
          id="pw-confirm"
          type={type}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      {error ? (
        <p className="surface-danger rounded-md px-3 py-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {success && knownCurrentPassword === undefined ? (
        <p className="surface-success rounded-md px-3 py-2 text-sm">Password changed.</p>
      ) : null}
      <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
        {saving ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
