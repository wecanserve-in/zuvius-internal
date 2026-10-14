import { useAuth } from '@/features/auth/AuthContext'
import { AdminDashboard } from '@/features/dashboard/AdminDashboard'
import { DepartmentAdminDashboard } from '@/features/dashboard/DepartmentAdminDashboard'
import { MemberDashboard } from '@/features/dashboard/MemberDashboard'
import { hasMinRole, isDepartmentAdminOnly } from '@/lib/permissions'

export function DashboardPage() {
  const { profile } = useAuth()

  if (!profile) return null
  if (isDepartmentAdminOnly(profile)) return <DepartmentAdminDashboard />
  if (hasMinRole(profile, 'admin')) return <AdminDashboard />
  return <MemberDashboard />
}
