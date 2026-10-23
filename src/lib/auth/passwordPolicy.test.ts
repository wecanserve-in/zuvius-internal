import { describe, expect, it } from 'vitest'
import { DEFAULT_TEMP_PASSWORD, validateNewPassword } from './passwordPolicy'

describe('validateNewPassword', () => {
  it('accepts a strong matching password', () => {
    expect(validateNewPassword('Pharma2026', 'Pharma2026')).toBeNull()
  })
  it('rejects short passwords', () => {
    expect(validateNewPassword('ab1', 'ab1')).toMatch(/at least 8/)
  })
  it('rejects the temporary password, any case', () => {
    expect(validateNewPassword(DEFAULT_TEMP_PASSWORD, DEFAULT_TEMP_PASSWORD)).toMatch(/different/)
    expect(validateNewPassword('ZUVIUS@123', 'ZUVIUS@123')).toMatch(/different/)
  })
  it('requires a letter and a number', () => {
    expect(validateNewPassword('abcdefgh', 'abcdefgh')).toMatch(/letter and one number/)
    expect(validateNewPassword('12345678', '12345678')).toMatch(/letter and one number/)
  })
  it('rejects mismatched confirmation', () => {
    expect(validateNewPassword('Pharma2026', 'Pharma2027')).toMatch(/do not match/)
  })
})
