/* Which service worker a page subscribes to push through.

   The members' app, the bar and the families' page are three installed apps
   on one site. Each has its own web manifest and, for the bar and the
   families, its own service worker scoped to its own path — so each gets its
   own push subscription, and Android files each notification under the app
   it belongs to. The members' app keeps the main (offline-caching) worker. */
export const surfaceScope = (path: string) =>
  path.startsWith('/bar') ? '/bar' : path.startsWith('/family') ? '/family' : null

export async function pushRegistration(path = location.pathname): Promise<ServiceWorkerRegistration> {
  const scope = surfaceScope(path)
  if (!scope) return navigator.serviceWorker.ready
  const reg = await navigator.serviceWorker.register('/surface-sw.js?v=1', { scope })
  // a subscription needs an active worker; a new one takes a moment
  const pending = reg.installing || reg.waiting
  if (!reg.active && pending) {
    await new Promise<void>((resolve) => {
      pending.addEventListener('statechange', () => { if (pending.state === 'activated') resolve() })
    })
  }
  return reg
}
