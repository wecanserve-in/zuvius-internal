import { buildPublicFileUrlFromKey } from '@/lib/r2Config'

/** Stable public URL when bucket/CDN allows direct reads (not a secret). */
export function resolvePublicFileUrl(
  objectKey: string,
  serverFileUrl?: string | null,
): string | undefined {
  if (serverFileUrl) return serverFileUrl
  return buildPublicFileUrlFromKey(objectKey)
}
