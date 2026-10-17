import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { useAuth } from '@/features/auth/AuthContext'
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth'

export function LoginPage() {
  const { login, firebaseUser, profile, loading, authError, profileError } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (!loading && profile?.isActive) {
      navigate('/', { replace: true })
    }
  }, [loading, profile, navigate])

  if (firebaseUser && loading) {
    return <LoadingScreen label="Loading your profile…" />
  }

  if (!loading && profile?.isActive) {
    return <Navigate to="/" replace />
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true)
    try {
      await login(values.email, values.password)
    } catch {
      // authError set in context
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-background)] p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img
            src="/zuvius-logo.png"
            alt="Zuvius Lifesciences"
            className="mx-auto mb-3 h-14 w-auto max-w-[220px] object-contain"
          />
          <CardTitle className="text-[var(--color-foreground)]">Internal workspace</CardTitle>
          <CardDescription>Sign in with your company account</CardDescription>
        </CardHeader>
        <CardContent>
          {firebaseUser && !loading && !profile ? (
            <div className="surface-warning mb-4 rounded-md px-3 py-2 text-sm">
              <p className="font-medium">Signed in, but profile not loaded.</p>
              <p className="mt-1 text-xs">
                {profileError ??
                  'Create Firestore document users/{your Auth UID} with role and isActive: true.'}
              </p>
            </div>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email ? (
                <p className="text-xs text-[var(--color-destructive)]">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="text-xs text-[var(--color-destructive)]">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>
            {authError ? (
              <p className="surface-danger rounded-md px-3 py-2 text-sm">{authError}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="text-center text-sm text-[var(--color-muted-foreground)]">
              <Link to="/forgot-password" className="text-link hover:underline">
                Forgot password?
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
