import { Mic, Square, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

function pickMimeType(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  return candidates.find((t) => MediaRecorder.isTypeSupported(t))
}

export function VoiceRecorder({
  onRecorded,
  disabled,
  layout = 'stacked',
  children,
}: {
  onRecorded: (blob: Blob, mimeType: string, durationMs: number) => void
  disabled?: boolean
  /** `composer` — mic in row; optional `children` (input + send) share the row. */
  layout?: 'stacked' | 'composer'
  children?: ReactNode
}) {
  const [recording, setRecording] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewMime, setPreviewMime] = useState<string>('audio/webm')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef<number>(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const start = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Recording is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const url = URL.createObjectURL(blob)
        setPreviewBlob(blob)
        setPreviewMime(type)
        setPreviewUrl(url)
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      startedAtRef.current = Date.now()
      setSeconds(0)
      timerRef.current = window.setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 250)
      setRecording(true)
    } catch {
      setError('Microphone permission denied or unavailable.')
    }
  }

  const stop = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const cancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewBlob(null)
    setSeconds(0)
  }

  const send = () => {
    if (!previewBlob) return
    const durationMs = seconds * 1000
    onRecorded(previewBlob, previewMime, durationMs)
    cancelPreview()
  }

  const micButton = !recording ? (
    <Button type="button" size="icon" variant="outline" disabled={disabled} onClick={start}>
      <Mic className="h-4 w-4" />
    </Button>
  ) : (
    <Button type="button" size="icon" variant="destructive" onClick={stop}>
      <Square className="h-4 w-4" />
    </Button>
  )

  const recordingLabel = recording ? (
    <span className="text-xs text-[var(--color-destructive)]">
      {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
    </span>
  ) : null

  const previewBar = previewUrl ? (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-2">
      <audio controls src={previewUrl} className="voice-message-audio max-w-[min(100%,240px)]" />
      <Button type="button" size="sm" onClick={send}>Send</Button>
      <Button type="button" size="icon" variant="ghost" onClick={cancelPreview} aria-label="Discard">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  ) : null

  if (layout === 'composer') {
    return (
      <div className="flex w-full flex-col gap-2">
        {previewBar}
        <div className="flex w-full items-end gap-2">
          <div className="flex shrink-0 items-center gap-1">
            {micButton}
            {recordingLabel}
          </div>
          {children}
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {micButton}
        {recordingLabel}
      </div>
      {previewBar}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}
