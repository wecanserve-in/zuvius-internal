const SHOWN_KEY = 'zuvius-baby-ceo-reactions-shown'
const MAX_STORED = 200

function readAll(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function writeAll(set: Set<string>) {
  try {
    const arr = [...set].slice(-MAX_STORED)
    localStorage.setItem(SHOWN_KEY, JSON.stringify(arr))
  } catch {
    /* ignore */
  }
}

export function hasShownReaction(dedupKey: string): boolean {
  return readAll().has(dedupKey)
}

export function markReactionShown(dedupKey: string) {
  const set = readAll()
  if (set.has(dedupKey)) return
  set.add(dedupKey)
  writeAll(set)
}

export function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
