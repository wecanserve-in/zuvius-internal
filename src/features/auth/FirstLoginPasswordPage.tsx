import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthContext'
import { DEFAULT_TEMP_PASSWORD } from '@/lib/auth/passwordPolicy'

/** Shown instead of the app until a new employee replaces the temporary password. */
export function FirstLoginPasswordPage() {
  const { profile, logout } = useAuth()
  const firstName = profile?.displayName.split(' ')[0] ?? 'there'

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <img src="/zuvius-logo.png" alt="Zuvius Lifesciences" className="h-10 object-contain object-left" />
          <CardTitle>Welcome, {firstName}! Set your own password</CardTitle>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            You signed in with the temporary password. Choose a new one that only you know before
            you continue.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChangePasswordForm
            knownCurrentPassword={DEFAULT_TEMP_PASSWORD}
            submitLabel="Save and continue"
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
