/** Remove PWA workers left on localhost from other projects (e.g. LMS on :5173). */
export async function cleanupDevServiceWorkers(): Promise<void> {
  if (!import.meta.env.DEV) return
  if (!('serviceWorker' in navigator)) return

  const registrations = await navigator.serviceWorker.getRegistrations()
  for (const registration of registrations) {
    const scriptUrl =
      registration.active?.scriptURL ??
      registration.installing?.scriptURL ??
      registration.waiting?.scriptURL ??
      ''

    // This app only uses firebase-messaging-sw.js when push is enabled.
    if (scriptUrl.includes('firebase-messaging-sw.js')) continue

    await registration.unregister()
    console.info('[Zuvius dev] Unregistered service worker:', scriptUrl || registration.scope)
  }
}
