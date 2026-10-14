import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { subscribeManagedDepartments } from '@/services/departments.service'
import type { Department } from '@/types'

/** Departments a department admin manages (profile.departmentIds + departments.adminIds). */
export function useManagedDepartments() {
  const { profile } = useAuth()
  const [managed, setManaged] = useState<Department[]>([])

  useEffect(() => {
    if (!profile) {
      setManaged([])
      return
    }
    return subscribeManagedDepartments(profile, setManaged)
  }, [profile?.id, profile?.role, profile?.departmentIds.join(',')])

  const managedIds = useMemo(() => managed.map((d) => d.id), [managed])

  return { managed, managedIds, allDepartments: managed }
}
