import { describe, expect, it } from 'vitest'
import {
  taskBodyFromFields,
  taskDisplayTitle,
  taskFieldsFromBody,
} from '@/lib/tasks/taskContent'

describe('taskContent', () => {
  it('merges legacy title and description for display', () => {
    expect(
      taskBodyFromFields({ title: 'Ship report', description: 'Include Q3 numbers' }),
    ).toBe('Ship report\nInclude Q3 numbers')
  })

  it('splits a single body into persisted fields', () => {
    const { title, description } = taskFieldsFromBody('First line\nMore detail')
    expect(title).toBe('First line')
    expect(description).toBe('First line\nMore detail')
  })

  it('uses title for list display when present', () => {
    expect(taskDisplayTitle({ title: 'A', description: 'B' })).toBe('A')
  })
})
