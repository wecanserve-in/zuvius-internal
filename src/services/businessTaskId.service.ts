import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type Transaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { departmentShortCode, formatBusinessTaskId } from '@/lib/tasks/departmentShortCode'
import type { Department } from '@/types'

const MAX_ATTEMPTS = 5

export async function deptCodeForDepartmentId(departmentId: string): Promise<string> {
  const deptSnap = await getDoc(doc(db, 'departments', departmentId))
  if (!deptSnap.exists()) {
    throw new Error('Department not found for task ID')
  }
  const dept = { id: deptSnap.id, ...deptSnap.data() } as Department
  return departmentShortCode(dept)
}

export function allocateBusinessTaskIdInTransaction(
  departmentId: string,
  deptCode: string,
  tx: Transaction,
): Promise<string> {
  const counterRef = doc(db, 'taskIdCounters', departmentId)
  return tx.get(counterRef).then((counterSnap) => {
    const lastSequence = counterSnap.exists() ? Number(counterSnap.data()?.lastSequence ?? 0) : 0
    const nextSequence = lastSequence + 1
    if (nextSequence > 999999) {
      throw new Error('Task ID sequence exhausted for this department')
    }
    tx.set(
      counterRef,
      {
        lastSequence: nextSequence,
        deptCode,
        departmentId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    return formatBusinessTaskId(deptCode, nextSequence)
  })
}

export async function allocateBusinessTaskId(departmentId: string): Promise<string> {
  const deptCode = await deptCodeForDepartmentId(departmentId)
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await runTransaction(db, async (tx) =>
        allocateBusinessTaskIdInTransaction(departmentId, deptCode, tx),
      )
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not allocate task ID')
}
