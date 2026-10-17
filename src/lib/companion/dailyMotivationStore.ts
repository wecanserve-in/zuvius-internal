import {
  DAILY_MOTIVATION_QUOTES,
  selectDailyQuoteIndex,
  todayKeyLocal,
} from '@/lib/companion/dailyMotivationQuotes'

const KEY_PREFIX = 'zuvius-baby-ceo-daily-motivation'

export interface DailyMotivationRecord {
  date: string
  quoteIndex: number
  dismissed: boolean
}

function storageKey(userId: string) {
  return `${KEY_PREFIX}:${userId}`
}

function readRaw(userId: string): DailyMotivationRecord | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as DailyMotivationRecord
    if (!parsed || typeof parsed.date !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

function writeRaw(userId: string, record: DailyMotivationRecord) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(record))
  } catch {
    /* ignore */
  }
}

export function loadDailyMotivation(userId: string): {
  visible: boolean
  quote: string
  quoteId: string
} {
  const today = todayKeyLocal()
  const prev = readRaw(userId)

  if (prev?.date === today) {
    const entry = DAILY_MOTIVATION_QUOTES[prev.quoteIndex] ?? DAILY_MOTIVATION_QUOTES[0]!
    return {
      visible: !prev.dismissed,
      quote: entry.text,
      quoteId: entry.id,
    }
  }

  const previousIndex =
    prev && prev.date !== today ? prev.quoteIndex : null
  const quoteIndex = selectDailyQuoteIndex(userId, today, previousIndex)
  const entry = DAILY_MOTIVATION_QUOTES[quoteIndex]!

  writeRaw(userId, {
    date: today,
    quoteIndex,
    dismissed: false,
  })

  return {
    visible: true,
    quote: entry.text,
    quoteId: entry.id,
  }
}

export function dismissDailyMotivation(userId: string) {
  const today = todayKeyLocal()
  const prev = readRaw(userId)
  const quoteIndex =
    prev?.date === today
      ? prev.quoteIndex
      : selectDailyQuoteIndex(userId, today, prev?.quoteIndex ?? null)

  writeRaw(userId, {
    date: today,
    quoteIndex,
    dismissed: true,
  })
}
