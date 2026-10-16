import { useEffect, useState } from 'react'
import { resolveStoredUploadUrl } from '@/lib/attachmentUrl'
import type { Task } from '@/types'

function taskAttachmentItems(task: {
  attachmentIds?: string[]
  attachmentMeta?: Task['attachmentMeta']
}): { uploadId: string; objectKey?: string; fileName?: string }[] {
  if (task.attachmentMeta?.length) {
    return task.attachmentMeta
  }
  return (task.attachmentIds ?? []).map((uploadId) => ({ uploadId }))
}

export function TaskAttachments({
  attachmentIds,
  attachmentMeta,
}: {
  attachmentIds?: string[]
  attachmentMeta?: Task['attachmentMeta']
}) {
  const items = taskAttachmentItems({ attachmentIds, attachmentMeta })
  const [links, setLinks] = useState<Record<string, string>>({})

  useEffect(() => {
    if (items.length === 0) return
    let cancelled = false
    void (async () => {
      const resolved: Record<string, string> = {}
      for (const item of items) {
        try {
          const url = await resolveStoredUploadUrl(item)
          if (url) resolved[item.uploadId] = url
        } catch {
          // skip
        }
      }
      if (!cancelled && Object.keys(resolved).length) {
        setLinks((prev) => ({ ...prev, ...resolved }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [items.map((i) => `${i.uploadId}:${i.objectKey ?? ''}`).join(',')])

  if (items.length === 0) return null

  return (
    <ul className="space-y-1 text-sm">
      {items.map((item) => (
        <li key={item.uploadId}>
          {links[item.uploadId] ? (
            <a
              href={links[item.uploadId]}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-primary)] hover:underline"
            >
              {item.fileName ?? 'Attachment'}
            </a>
          ) : (
            <span className="text-[var(--color-muted-foreground)]">Loading attachment…</span>
          )}
        </li>
      ))}
    </ul>
  )
}
