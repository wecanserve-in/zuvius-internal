import { describe, expect, it } from 'vitest'
import { isAllowedUploadOrigin } from '../src/lib/cors'

describe('upload HTTP CORS origins', () => {
  it('allows local Vite dev server', () => {
    expect(isAllowedUploadOrigin('http://localhost:5173')).toBe(true)
    expect(isAllowedUploadOrigin('http://127.0.0.1:5173')).toBe(true)
  })

  it('allows Firebase Hosting origins', () => {
    expect(isAllowedUploadOrigin('https://internal-chat-bc793.web.app')).toBe(true)
    expect(isAllowedUploadOrigin('https://internal-chat-bc793.firebaseapp.com')).toBe(true)
  })

  it('allows other localhost ports for dev', () => {
    expect(isAllowedUploadOrigin('http://localhost:3000')).toBe(true)
  })

  it('rejects unknown origins', () => {
    expect(isAllowedUploadOrigin('https://evil.example')).toBe(false)
    expect(isAllowedUploadOrigin(undefined)).toBe(false)
  })
})
