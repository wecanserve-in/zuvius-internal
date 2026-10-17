import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  clampAnchorPosition,
  defaultCompanionPosition,
} from '@/lib/companion/companionPosition'

describe('companionPosition', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 400)
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  })

  it('default anchor is within bounds', () => {
    const d = defaultCompanionPosition()
    expect(d.right).toBeGreaterThan(0)
    expect(d.bottom).toBeGreaterThan(0)
  })

  it('widening the widget only shifts anchor when needed', () => {
    const pos = { right: 12, bottom: 40 }
    const compact = clampAnchorPosition(pos, 56, 56)
    const wide = clampAnchorPosition(pos, 300, 200)
    expect(compact.right).toBe(12)
    expect(wide.right).toBe(12)
    expect(compact.bottom).toBe(40)
    expect(wide.bottom).toBe(40)
  })

  it('pulls anchor left when panel would clip', () => {
    const fitted = clampAnchorPosition({ right: 2, bottom: 40 }, 300, 200)
    expect(fitted.right + 300).toBeLessThanOrEqual(400 - 8)
  })
})
