export interface CompanionPosition {
  right: number
  bottom: number
}

const STORAGE_KEY = 'zuvius-baby-ceo-position'

export const COMPANION_SIZE_COMPACT = 56
export const COMPANION_SIZE_EXPANDED = 80

/** Approximate panel width (matches Tailwind min(19rem, calc(100vw - 1.5rem))). */
export function estimatePanelWidth(): number {
  if (typeof window === 'undefined') return 304
  return Math.min(304, window.innerWidth - 24)
}

export function estimateBubbleWidth(): number {
  if (typeof window === 'undefined') return 232
  return Math.min(232, window.innerWidth - 24)
}

export function getSafeBounds() {
  const margin = 8
  const bottomInset =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches
      ? 56 + 8
      : 24
  return { margin, bottomInset }
}

export function defaultCompanionPosition(): CompanionPosition {
  const { margin, bottomInset } = getSafeBounds()
  return {
    right: margin + 4,
    bottom: bottomInset + margin,
  }
}

/**
 * Bottom-right anchor: avatar corner stays fixed while panel/bubble grow upward and left.
 * Only adjusts when the cluster would clip off-screen.
 */
export function clampAnchorPosition(
  pos: CompanionPosition,
  widgetWidth: number,
  widgetHeight: number,
): CompanionPosition {
  const { margin, bottomInset } = getSafeBounds()
  const minRight = margin
  const minBottom = bottomInset + margin
  const maxRight = Math.max(minRight, window.innerWidth - margin - widgetWidth)
  const maxBottom = Math.max(minBottom, window.innerHeight - margin - widgetHeight)
  return {
    right: Math.min(maxRight, Math.max(minRight, pos.right)),
    bottom: Math.min(maxBottom, Math.max(minBottom, pos.bottom)),
  }
}

function migrateLegacyPosition(raw: Record<string, unknown>): CompanionPosition | null {
  if (typeof raw.right === 'number' && typeof raw.bottom === 'number') {
    return { right: raw.right, bottom: raw.bottom }
  }
  if (typeof raw.x === 'number' && typeof raw.y === 'number') {
    const w = COMPANION_SIZE_COMPACT
    return {
      right: window.innerWidth - raw.x - w,
      bottom: window.innerHeight - raw.y - w,
    }
  }
  return null
}

export function loadCompanionPosition(): CompanionPosition {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultCompanionPosition()
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const migrated = migrateLegacyPosition(parsed)
    if (!migrated) return defaultCompanionPosition()
    return clampAnchorPosition(migrated, COMPANION_SIZE_EXPANDED, COMPANION_SIZE_EXPANDED)
  } catch {
    return defaultCompanionPosition()
  }
}

export function saveCompanionPosition(pos: CompanionPosition) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(clampAnchorPosition(pos, COMPANION_SIZE_EXPANDED, COMPANION_SIZE_EXPANDED)),
    )
  } catch {
    /* ignore */
  }
}
