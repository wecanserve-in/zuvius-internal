import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { useAuth } from '@/features/auth/AuthContext'

export function ProtectedRoute() {
  const { firebaseUser, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!firebaseUser) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">Account not provisioned</h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Your Firebase account exists but no Zuvius user profile was found. Contact your
            administrator.
          </p>
        </div>
      </div>
    )
  }
  if (!profile.isActive) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">Account deactivated</h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            This account has been deactivated. Contact your administrator.
          </p>
        </div>
      </div>
    )
  }
  return <Outlet />
}
