import { Calendar } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ClockTimePicker } from '@/components/tasks/ClockTimePicker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

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
  if (!time) return `${date}T09:00`
  return `${date}T${time}`
}

export function DueDateTimeField({
  id = 'task-due',
  value,
  onChange,
  disabled,
  label = 'Due',
  compact = false,
  inline = false,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  label?: string
  compact?: boolean
  inline?: boolean
}) {
  const { date, time } = parseLocalDateTime(value)
  const [draftTime, setDraftTime] = useState(time)

  useEffect(() => {
    setDraftTime(time)
  }, [time, date])

  const commit = (nextDate: string, nextTime: string) => {
    if (!nextDate) {
      onChange('')
      return
    }
    onChange(joinLocalDateTime(nextDate, nextTime))
  }

  const onDateChange = (nextDate: string) => {
    if (!nextDate) {
      onChange('')
      setDraftTime('')
      return
    }
    commit(nextDate, draftTime || time)
  }

  const onClockTime = (next: string) => {
    setDraftTime(next)
    if (date) commit(date, next)
  }

  const clockDisabled = disabled || !date

  if (inline) {
    return (
      <div className="flex shrink-0 items-center gap-0.5">
        <Input
          id={`${id}-date`}
          type="date"
          className="h-8 w-[8.75rem] px-1.5 text-xs"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          disabled={disabled}
          aria-label={`${label} date`}
        />
        <ClockTimePicker
          id={`${id}-time`}
          value={draftTime}
          onChange={onClockTime}
          disabled={clockDisabled}
          aria-label={`${label} time`}
          title={clockDisabled && !disabled ? 'Choose a date first' : undefined}
        />
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', compact && 'min-w-0')}>
      <Label
        htmlFor={`${id}-date`}
        className={cn('flex items-center gap-1 text-xs', compact && 'sr-only')}
      >
        <Calendar className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" aria-hidden />
        {label}
        <span className="font-normal text-[var(--color-muted-foreground)]">(optional)</span>
      </Label>
      <div className={cn('flex flex-wrap items-center gap-1.5', compact && 'gap-1')}>
        <Input
          id={`${id}-date`}
          type="date"
          className={cn('h-9 w-[10.5rem] text-sm', compact && 'h-8 w-[9.5rem] text-xs')}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          disabled={disabled}
          aria-label={`${label} date`}
        />
        <ClockTimePicker
          id={`${id}-time`}
          value={draftTime}
          onChange={onClockTime}
          disabled={clockDisabled}
          aria-label={`${label} time`}
          className={compact ? '[&_button]:h-8' : undefined}
          title={clockDisabled && !disabled ? 'Choose a date first' : undefined}
        />
      </div>
    </div>
  )
}
