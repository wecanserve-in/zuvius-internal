import { describe, expect, it } from 'vitest'
import {
  babyCEODailyQuotes,
  DAILY_MOTIVATION_QUOTES,
  selectDailyQuoteIndex,
} from '@/lib/companion/dailyMotivationQuotes'

describe('babyCEODailyQuotes', () => {
  it('includes exactly 100 quotes with stable ids', () => {
    expect(babyCEODailyQuotes).toHaveLength(100)
    expect(DAILY_MOTIVATION_QUOTES).toHaveLength(100)
    expect(DAILY_MOTIVATION_QUOTES[0]?.id).toBe('q1')
    expect(DAILY_MOTIVATION_QUOTES[99]?.id).toBe('q100')
    expect(DAILY_MOTIVATION_QUOTES[99]?.text).toBe(
      'CEO mindset: own the task, respect the team, deliver the result.',
    )
  })
})

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
