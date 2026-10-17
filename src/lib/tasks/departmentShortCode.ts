import type { Department } from '@/types'

const OVERRIDES: Record<string, string> = {
  marketing: 'MKT',
  sales: 'SALES',
  hr: 'HR',
  'human resources': 'HR',
  it: 'IT',
  'information technology': 'IT',
  finance: 'FIN',
  operations: 'OPS',
  legal: 'LEG',
  rnd: 'RND',
  'r&d': 'RND',
  research: 'RND',
}

/** Stable short code for ZVS-{CODE}-000001 (max 12 chars). */
export function departmentShortCode(dept: Pick<Department, 'id' | 'name'>): string {
  const key = dept.name.trim().toLowerCase()
  if (OVERRIDES[key]) return OVERRIDES[key]
  const words = dept.name
    .replace(/&/g, ' and ')
    .split(/[\s/_-]+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
  if (words.length === 0) {
    const fallback = dept.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()
    return fallback ? `D${fallback}` : 'GEN'
  }
  if (words.length === 1) {
    const w = words[0]!
    return (w.length <= 12 ? w : w.slice(0, 12)).toUpperCase()
  }
  const acronym = words.map((w) => w[0]).join('').toUpperCase()
  return acronym.length <= 12 ? acronym : acronym.slice(0, 12)
}

export function formatBusinessTaskId(deptCode: string, sequence: number): string {
  const seq = Math.max(1, Math.min(999999, Math.floor(sequence)))
  return `ZVS-${deptCode}-${String(seq).padStart(6, '0')}`
}
