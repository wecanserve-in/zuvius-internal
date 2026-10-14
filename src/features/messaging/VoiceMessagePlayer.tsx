import { Mic } from 'lucide-react'

function formatDurationMs(ms?: number): string | null {
  if (ms == null || ms <= 0) return null
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VoiceMessagePlayer({
  src,
  durationMs,
  isOwn,
}: {
  src: string
  durationMs?: number
  isOwn?: boolean
}) {
  const durationLabel = formatDurationMs(durationMs)

  return (
    <div
      className={`flex min-w-[min(100%,280px)] max-w-[280px] items-center gap-2 rounded-xl px-2 py-1.5 ${
        isOwn ? 'bg-white text-[var(--color-foreground)]' : 'bg-[var(--color-background)]'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isOwn ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' : 'bg-[var(--color-muted)]'
        }`}
        aria-hidden
      >
        <Mic className="h-4 w-4" />
      </span>
      <audio
        controls
        preload="metadata"
        src={src}
        className="voice-message-audio min-h-9 min-w-0 flex-1"
      />
      {durationLabel ? (
        <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
          {durationLabel}
        </span>
      ) : null}
    </div>
  )
}
