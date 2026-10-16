/**
 * Browser R2 settings. With VITE_UPLOAD_DIRECT_R2=true + VITE_R2_ACCESS_KEY_ID/SECRET (AddCourse-style),
 * uploads go straight to R2. Otherwise presigned URLs from Cloud Functions (keys in functions/.env only).
 */
export const r2AccountId =
  import.meta.env.VITE_R2_ACCOUNT_ID ?? '45b20d97ffbad9e7a7573c735af61f19'

export const r2BucketName = import.meta.env.VITE_R2_BUCKET_NAME ?? 'lms-portal'

export const r2ObjectPrefix = 'zuvius-internal'

/** Public CDN / custom domain for objects that are allowed to be read via stable URL. */
export function getR2PublicUrlBase(): string | undefined {
  const url =
    import.meta.env.VITE_R2_PUBLIC_URL ?? import.meta.env.VITE_R2_PUBLIC_URL_BASE
  return url?.replace(/\/+$/, '') || undefined
}

export function buildPublicFileUrlFromKey(objectKey: string): string | undefined {
  const base = getR2PublicUrlBase()
  if (!base) return undefined
  return `${base}/${objectKey.replace(/^\/+/, '')}`
}
