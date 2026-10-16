const TASK_HUB_SEGMENTS = new Set([
  'mine',
  'overdue',
  'created',
  'pending',
  'completed',
  'today',
  'department',
  'new',
])

/** Floating create button — hidden on immersive / action-heavy screens. */
export function shouldShowMobileFab(pathname: string): boolean {
  if (pathname.startsWith('/tasks/new') || pathname.startsWith('/projects/new')) return false
  if (pathname.startsWith('/messages/') && pathname.length > '/messages/'.length) return false

  if (pathname.startsWith('/tasks/')) {
    const segment = pathname.slice('/tasks/'.length).split('/')[0]
    if (!segment || TASK_HUB_SEGMENTS.has(segment)) return true
    return false
  }

  return true
}

export const mobileBottomNavOffsetClass =
  'pb-[calc(3.5rem+env(safe-area-inset-bottom))]'

export const mobileFabOffsetClass =
  'bottom-[calc(3.5rem+0.5rem+env(safe-area-inset-bottom))]'
