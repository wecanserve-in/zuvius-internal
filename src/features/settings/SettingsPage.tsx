import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthContext'
import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import { formatUserRole } from '@/lib/permissions'
import { registerFcmToken } from '@/lib/firebase/messaging'
import { formatUploadCallableError, uploadProfilePhoto } from '@/services/uploads.service'
import { setProfilePhotoUploadId } from '@/services/users.service'

export function SettingsPage() {
  const { profile } = useAuth()
  const photoUrl = usePhotoUrl(profile)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const onPhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !profile) return
    setUploadError(null)
    setUploading(true)
    try {
      const contentType = file.type || 'image/jpeg'
      const { uploadId, objectKey, fileUrl } = await uploadProfilePhoto(
        profile.id,
        file,
        file.name,
        contentType,
      )
      await setProfilePhotoUploadId(profile.id, uploadId, objectKey, fileUrl)
    } catch (err) {
      setUploadError(formatUploadCallableError(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)] text-lg font-semibold">
              {profile?.displayName?.charAt(0) ?? '?'}
            </div>
          )}
          <div>
            <p className="mb-1 text-xs text-[var(--color-muted-foreground)]">Profile photo (stored in R2)</p>
            <Input type="file" accept="image/*" disabled={uploading} onChange={(ev) => void onPhotoPick(ev)} />
          </div>
          {uploadError ? <p className="text-sm text-danger">{uploadError}</p> : null}
          <p>Name: {profile?.displayName}</p>
          <p>Email: {profile?.email}</p>
          <p className="capitalize">Role: {profile ? formatUserRole(profile.role) : '—'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm text-white"
            onClick={() => void registerFcmToken()}
          >
            Enable push notifications
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
