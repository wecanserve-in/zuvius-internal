import type { Task } from '@/types'

/** First line or truncated body for list views and notifications (legacy title preserved). */
export function taskDisplayTitle(task: Pick<Task, 'title' | 'description'>): string {
  const title = task.title?.trim()
  if (title) return title
  const body = task.description?.trim()
  if (!body) return 'Untitled task'
  const firstLine = body.split(/\r?\n/)[0]?.trim()
  return firstLine && firstLine.length <= 120 ? firstLine : `${body.slice(0, 117)}…`
}

/** Combined body for forms and detail (backward compatible). */
export function taskBodyFromFields(task: Pick<Task, 'title' | 'description'>): string {
  const title = task.title?.trim() ?? ''
  const desc = task.description?.trim() ?? ''
  if (!title) return desc
  if (!desc || desc === title) return title
  if (desc.startsWith(title)) return desc
  return `${title}\n${desc}`
}

/** Split a single user-entered body into persisted title + description. */
export function taskFieldsFromBody(bodyRaw: string): { title: string; description: string } {
  const body = bodyRaw.trim()
  if (!body) {
    return { title: '', description: '' }
  }
  const lines = body.split(/\r?\n/)
  const first = lines[0]?.trim() ?? body
  const rest = lines.slice(1).join('\n').trim()
  const title = first.length > 200 ? `${first.slice(0, 200)}…` : first
  const description = rest ? (first.length > 200 ? body : body) : first
  return { title, description }
}
