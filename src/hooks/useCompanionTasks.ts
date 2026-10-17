import { useEffect, useState } from 'react'
import { subscribeMyTasks } from '@/services/tasks.service'
import type { Task } from '@/types'

export function useCompanionTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[] | null>(null)

  useEffect(() => {
    if (!userId) {
      setTasks(null)
      return
    }
    return subscribeMyTasks(userId, setTasks)
  }, [userId])

  return tasks
}
