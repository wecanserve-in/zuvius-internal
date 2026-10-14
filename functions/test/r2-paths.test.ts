import { describe, expect, it, beforeEach } from 'vitest'
import { buildObjectKey } from '../src/lib/r2'

describe('buildObjectKey', () => {
  beforeEach(() => {
    process.env.R2_OBJECT_PREFIX = 'zuvius-internal'
  })

  it('places chat images under zuvius-internal/chat-images/', () => {
    const key = buildObjectKey('user1', 'photo.png', 'conversation', 'image/png')
    expect(key.startsWith('zuvius-internal/chat-images/user1/')).toBe(true)
    expect(key.endsWith('-photo.png')).toBe(true)
  })

  it('places profile photos under zuvius-internal/profiles/', () => {
    const key = buildObjectKey('user1', 'avatar.jpg', 'profile', 'image/jpeg')
    expect(key.startsWith('zuvius-internal/profiles/user1/')).toBe(true)
  })

  it('places voice under chat-audio', () => {
    const key = buildObjectKey('user1', 'voice.webm', 'conversation', 'audio/webm')
    expect(key.includes('/chat-audio/')).toBe(true)
  })
})
