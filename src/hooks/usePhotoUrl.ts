import { useEffect, useState } from 'react'
import { resolveStoredUploadUrl } from '@/lib/attachmentUrl'
import type { AppUser } from '@/types'

/** R2 profile photo URL (public CDN or presigned GET from photoObjectKey). */
export function usePhotoUrl(user: AppUser | null | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(user?.photoURL)

  useEffect(() => {
    if (!user) {
      setUrl(undefined)
      return
    }
    if (!user.photoUploadId && !user.photoObjectKey) {
      setUrl(user.photoURL)
      return
    }
    let cancelled = false
    void resolveStoredUploadUrl({
      uploadId: user.photoUploadId ?? '',
      objectKey: user.photoObjectKey,
      fileUrl: user.photoURL,
    })
      .then((resolved) => {
        if (!cancelled) setUrl(resolved ?? user.photoURL)
      })
      .catch(() => {
        if (!cancelled) setUrl(user.photoURL)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.photoUploadId, user?.photoObjectKey, user?.photoURL])

  return url
}
