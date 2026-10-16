import { Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function parseLocalDateTime(value: string): { date: string; time: string } {
  if (!value.trim()) return { date: '', time: '' }
  const [datePart, timePart] = value.split('T')
  return {
    date: datePart ?? '',
    time: timePart ? timePart.slice(0, 5) : '',
  }
}

function joinLocalDateTime(date: string, time: string): string {
  if (!date) return ''
  return `${date}T${time || '09:00'}`
}

export function DueDateTimeField({
  id = 'task-due',
  value,
  onChange,
  disabled,
  label = 'Due date & time',
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  label?: string
}) {
  const { date, time } = parseLocalDateTime(value)

  return (
    <div className="space-y-1">
      <Label htmlFor={`${id}-date`} className="flex items-center gap-1.5 text-xs">
        <Calendar className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" aria-hidden />
        {label}
        <span className="font-normal text-[var(--color-muted-foreground)]">(optional)</span>
      </Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_min(7rem,40%)]">
        <Input
          id={`${id}-date`}
          type="date"
          className="h-9 text-sm"
          value={date}
          onChange={(e) => onChange(joinLocalDateTime(e.target.value, time))}
          disabled={disabled}
        />
        <Input
          id={`${id}-time`}
          type="time"
          className="h-9 text-sm"
          value={time}
          onChange={(e) => onChange(joinLocalDateTime(date, e.target.value))}
          disabled={disabled || !date}
          aria-label="Due time"
        />
      </div>
    </div>
  )
}
