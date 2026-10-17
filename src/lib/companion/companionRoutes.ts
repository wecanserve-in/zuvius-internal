/** Dashboard / tasks hub query routes (existing router redirects). */
export const COMPANION_ROUTES = {
  tasksToday: '/?scope=yours&tab=today',
  tasksOverdue: '/?scope=yours&tab=overdue',
  tasksMine: '/?scope=yours&tab=mine',
  tasksCompleted: '/?scope=yours&tab=completed',
  reports: '/reports',
  notifications: '/notifications',
} as const

export function taskDetailPath(taskId: string): string {
  return `/tasks/${taskId}`
}

export function projectDetailPath(projectId: string): string {
  return `/projects/${projectId}`
}
