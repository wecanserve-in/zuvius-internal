import { describe, expect, it, vi } from 'vitest'
import { buildPublicFileUrlFromKey, r2ObjectPrefix } from '@/lib/r2Config'

describe('r2Config', () => {
  it('uses zuvius-internal prefix', () => {
    expect(r2ObjectPrefix).toBe('zuvius-internal')
  })

  it('builds public URLs from object keys when env is set', () => {
    vi.stubEnv('VITE_R2_PUBLIC_URL', 'https://cdn.example.com')
    expect(buildPublicFileUrlFromKey('zuvius-internal/chat-images/x.png')).toBe(
      'https://cdn.example.com/zuvius-internal/chat-images/x.png',
    )
    vi.unstubAllEnvs()
  })
})
