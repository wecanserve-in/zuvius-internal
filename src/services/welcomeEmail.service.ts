import { auth } from '@/lib/firebase/config'

/** Same-origin PHP endpoint on Hostinger (see public/api/welcome-email.php). */
const ENDPOINT = '/api/welcome-email.php'

/**
 * Emails an employee their sign-in link and the temporary password.
 * Resolves to null on success, or a short reason the admin can act on.
 */
export async function sendWelcomeEmail(email: string): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return 'You are signed out.'
  try {
    const idToken = await user.getIdToken()
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, email }),
    })
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    if (res.ok && body?.ok) return null
    if (res.status === 404 && !body) return 'Email sending only works on the live site.'
    return body?.error ?? `Email service error (${res.status})`
  } catch {
    return 'Could not reach the email service.'
  }
}
