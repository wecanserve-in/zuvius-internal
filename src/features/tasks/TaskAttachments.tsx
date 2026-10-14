import { useEffect, useState } from 'react'
import { getDownloadUrl } from '@/services/uploads.service'

export function TaskAttachments({ uploadIds }: { uploadIds: string[] }) {
  const [links, setLinks] = useState<Record<string, string>>({})

  useEffect(() => {
    if (uploadIds.length === 0) return
    void (async () => {
      const next: Record<string, string> = {}
      for (const id of uploadIds) {
        try {
          next[id] = await getDownloadUrl(id)
        } catch {
          // skip unreadable
        }
      }
      setLinks(next)
    })()
  }, [uploadIds.join(',')])

  if (uploadIds.length === 0) return null

  return (
    <ul className="space-y-1 text-sm">
      {uploadIds.map((id) => (
        <li key={id}>
          {links[id] ? (
            <a
              href={links[id]}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-primary)] hover:underline"
            >
              Attachment
            </a>
          ) : (
            <span className="text-[var(--color-muted-foreground)]">Loading attachment…</span>
          )}
        </li>
      ))}
    </ul>
  )
}
