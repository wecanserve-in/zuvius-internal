import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase/config'
import type { UserRole } from '@/types'

export interface CreateEmployeeInput {
  email: string
  password: string
  displayName: string
  role: UserRole
  departmentIds?: string[]
}

export async function createEmployee(input: CreateEmployeeInput): Promise<string> {
  const fn = httpsCallable<CreateEmployeeInput, { userId: string }>(
    functions,
    'createEmployeeAccount',
  )
  const result = await fn(input)
  return result.data.userId
}

export async function createDepartment(input: {
  name: string
  description?: string
}): Promise<string> {
  const fn = httpsCallable<{ name: string; description?: string }, { departmentId: string }>(
    functions,
    'createDepartment',
  )
  const result = await fn(input)
  return result.data.departmentId
}
