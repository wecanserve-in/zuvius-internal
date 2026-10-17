import { describe, expect, it } from 'vitest'
import { departmentShortCode, formatBusinessTaskId } from './departmentShortCode'

describe('departmentShortCode', () => {
  it('uses known overrides', () => {
    expect(departmentShortCode({ id: '1', name: 'Marketing' })).toBe('MKT')
    expect(departmentShortCode({ id: '2', name: 'HR' })).toBe('HR')
  })

  it('formats business task ids', () => {
    expect(formatBusinessTaskId('MKT', 1)).toBe('ZVS-MKT-000001')
    expect(formatBusinessTaskId('MKT', 42)).toBe('ZVS-MKT-000042')
  })
})
