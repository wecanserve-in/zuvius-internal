import { useEffect, useState } from 'react'
import { getDownloadUrl } from '@/services/uploads.service'
import type { AppUser } from '@/types'

/** Resolves a short-lived R2 URL for profile photos stored as photoUploadId. */
export function usePhotoUrl(user: AppUser | null | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(user?.photoURL)

  useEffect(() => {
    if (!user) {
      setUrl(undefined)
      return
    }
    if (!user.photoUploadId) {
      setUrl(user.photoURL)
      return
    }
    let cancelled = false
    void getDownloadUrl(user.photoUploadId)
      .then((signed) => {
        if (!cancelled) setUrl(signed)
      })
      .catch(() => {
        if (!cancelled) setUrl(user.photoURL)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.photoUploadId, user?.photoURL])

  return url
}
