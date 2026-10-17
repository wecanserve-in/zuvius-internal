import { describe, expect, it } from 'vitest'
import { selectDailyQuoteIndex } from '@/lib/companion/dailyMotivationQuotes'

describe('selectDailyQuoteIndex', () => {
  it('is stable for the same user and date', () => {
    const a = selectDailyQuoteIndex('u1', '2026-10-17', null)
    const b = selectDailyQuoteIndex('u1', '2026-10-17', null)
    expect(a).toBe(b)
  })

  it('differs from previous day index when possible', () => {
    const prev = selectDailyQuoteIndex('u1', '2026-10-16', null)
    const next = selectDailyQuoteIndex('u1', '2026-10-17', prev)
    expect(next).not.toBe(prev)
  })
})
