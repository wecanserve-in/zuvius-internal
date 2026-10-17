import { Clock } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Phase = 'hour' | 'minute'

const PANEL_WIDTH = 232
const PANEL_HEIGHT = 308

function parseTime24(value: string): { h24: number; m: number } {
  const [hs, ms] = value.split(':')
  const h24 = Number(hs)
  const m = Number(ms)
  if (Number.isNaN(h24) || Number.isNaN(m)) return { h24: 9, m: 0 }
  return { h24: Math.min(23, Math.max(0, h24)), m: Math.min(59, Math.max(0, m)) }
}

function toTimeString(h24: number, m: number): string {
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function h24To12(h24: number): { h12: number; pm: boolean } {
  const pm = h24 >= 12
  const h = h24 % 12
  return { h12: h === 0 ? 12 : h, pm }
}

function h12To24(h12: number, pm: boolean): number {
  if (h12 === 12) return pm ? 12 : 0
  return pm ? h12 + 12 : h12
}

const HOUR_FACE = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const MINUTE_FACE = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function dialPosition(index: number, total: number, radius: number, size: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2
  const cx = size / 2
  const cy = size / 2
  return {
    left: cx + radius * Math.cos(angle) - 16,
    top: cy + radius * Math.sin(angle) - 16,
  }
}

function computePanelPosition(trigger: HTMLElement): { top: number; left: number } {
  const rect = trigger.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const openAbove = spaceBelow < PANEL_HEIGHT + 16 || rect.bottom > window.innerHeight * 0.55
  const top = openAbove
    ? Math.max(8, rect.top - PANEL_HEIGHT - 8)
    : Math.min(window.innerHeight - PANEL_HEIGHT - 8, rect.bottom + 8)
  let left = rect.left + rect.width / 2 - PANEL_WIDTH / 2
  left = Math.max(8, Math.min(left, window.innerWidth - PANEL_WIDTH - 8))
  return { top, left }
}

export function ClockTimePicker({
  value,
  onChange,
  disabled,
  className,
  id,
  'aria-label': ariaLabel = 'Due time',
  title,
}: {
  value: string
  onChange: (time: string) => void
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
  title?: string
}) {
  const listId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef({ h12: 9, pm: false, minute: 0 })
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('hour')
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })
  const parsed = parseTime24(value || '09:00')
  const { h12, pm } = h24To12(parsed.h24)
  const [draftH12, setDraftH12] = useState(h12)
  const [draftPm, setDraftPm] = useState(pm)
  const [draftMinute, setDraftMinute] = useState(parsed.m)

  const syncDraftRef = (next: { h12: number; pm: boolean; minute: number }) => {
    draftRef.current = next
  }

  useEffect(() => {
    const p = parseTime24(value || '09:00')
    const t = h24To12(p.h24)
    setDraftH12(t.h12)
    setDraftPm(t.pm)
    setDraftMinute(p.m)
    syncDraftRef({ h12: t.h12, pm: t.pm, minute: p.m })
  }, [value])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    setPanelPos(computePanelPosition(triggerRef.current))
  }, [open, phase])

  useEffect(() => {
    if (!open) return
    const onResize = () => {
      if (triggerRef.current) setPanelPos(computePanelPosition(triggerRef.current))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
      setPhase('hour')
    }
    window.setTimeout(() => document.addEventListener('click', onDocClick, true), 0)
    return () => document.removeEventListener('click', onDocClick, true)
  }, [open])

  const openPicker = () => {
    if (disabled) return
    const p = parseTime24(value || '09:00')
    const t = h24To12(p.h24)
    setDraftH12(t.h12)
    setDraftPm(t.pm)
    setDraftMinute(p.m)
    syncDraftRef({ h12: t.h12, pm: t.pm, minute: p.m })
    setPhase('hour')
    if (triggerRef.current) setPanelPos(computePanelPosition(triggerRef.current))
    setOpen(true)
  }

  const display = value ? formatDisplay(value) : '--:--'
  const size = 200
  const radius = 68

  const pickHour = (hour: number) => {
    setDraftH12(hour)
    syncDraftRef({ ...draftRef.current, h12: hour })
    setPhase('minute')
  }

  const setPm = (nextPm: boolean) => {
    setDraftPm(nextPm)
    syncDraftRef({ ...draftRef.current, pm: nextPm })
  }

  const pickMinute = (minute: number) => {
    const { h12: h, pm: isPm } = draftRef.current
    const h24 = h12To24(h, isPm)
    const time = toTimeString(h24, minute)
    setDraftMinute(minute)
    syncDraftRef({ ...draftRef.current, minute })
    onChange(time)
    setOpen(false)
    setPhase('hour')
  }

  const stopPanelPointer = (e: PointerEvent) => {
    e.stopPropagation()
  }

  const centerLabel =
    phase === 'hour'
      ? `${draftH12}:${String(draftMinute).padStart(2, '0')} ${draftPm ? 'PM' : 'AM'}`
      : `${draftH12}:${String(draftMinute).padStart(2, '0')}`

  const panel =
    open ? (
      <div
        ref={panelRef}
        role="dialog"
        aria-labelledby={listId}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-xl"
        style={{
          position: 'fixed',
          top: panelPos.top,
          left: panelPos.left,
          width: PANEL_WIDTH,
          zIndex: 10050,
        }}
        onPointerDown={stopPanelPointer}
      >
        <p id={listId} className="mb-2 text-center text-xs font-medium text-[var(--color-muted-foreground)]">
          {phase === 'hour' ? 'Select hour' : 'Select minutes'}
        </p>
        <div className="mb-2 flex justify-center gap-1">
          <button
            type="button"
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium',
              !draftPm ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-muted)]',
            )}
            onPointerDown={(e) => {
              e.preventDefault()
              setPm(false)
            }}
          >
            AM
          </button>
          <button
            type="button"
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium',
              draftPm ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-muted)]',
            )}
            onPointerDown={(e) => {
              e.preventDefault()
              setPm(true)
            }}
          >
            PM
          </button>
        </div>
        <div
          className="relative mx-auto touch-manipulation rounded-full bg-[var(--color-muted)]/25"
          style={{ width: size, height: size }}
        >
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-[var(--color-card)] text-center shadow-sm"
          >
            <span className="text-sm font-semibold tabular-nums leading-tight">{centerLabel}</span>
            {phase === 'minute' ? (
              <button
                type="button"
                className="pointer-events-auto mt-0.5 text-[10px] text-[var(--color-primary)] hover:underline"
                onPointerDown={(e) => {
                  e.preventDefault()
                  setPhase('hour')
                }}
              >
                Hour
              </button>
            ) : null}
          </div>
          {phase === 'hour'
            ? HOUR_FACE.map((hour, i) => {
                const pos = dialPosition(i, 12, radius, size)
                const selected = draftH12 === hour
                return (
                  <button
                    key={hour}
                    type="button"
                    className={cn(
                      'absolute z-20 flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                      selected
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-card)] hover:bg-[var(--color-primary)]/15',
                    )}
                    style={{ left: pos.left, top: pos.top }}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      pickHour(hour)
                    }}
                  >
                    {hour}
                  </button>
                )
              })
            : MINUTE_FACE.map((minute, i) => {
                const pos = dialPosition(i, 12, radius, size)
                const selected = draftMinute === minute
                return (
                  <button
                    key={minute}
                    type="button"
                    className={cn(
                      'absolute z-20 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-medium tabular-nums transition-colors',
                      selected
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-card)] hover:bg-[var(--color-primary)]/15',
                    )}
                    style={{ left: pos.left, top: pos.top }}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      pickMinute(minute)
                    }}
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                )
              })}
        </div>
      </div>
    ) : null

  return (
    <div className={cn('relative', className)}>
      <Button
        ref={triggerRef}
        type="button"
        id={id}
        variant="outline"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="h-8 w-[5.25rem] justify-start gap-1 px-1.5 text-xs font-normal tabular-nums"
        title={title}
        onClick={openPicker}
      >
        <Clock className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
        {display}
      </Button>
      {panel ? createPortal(panel, document.body) : null}
    </div>
  )
}

function formatDisplay(value: string): string {
  const { h24, m } = parseTime24(value)
  const d = new Date()
  d.setHours(h24, m, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })
}
