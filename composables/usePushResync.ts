/* Keep this device's push subscription alive and filed under whoever is
   signed in. Runs once per launch: if notifications were ever allowed here,
   fetch (or re-create) the browser's subscription and tell the server. This
   is what heals a subscription Android quietly rotated or dropped, and what
   covers "I allowed it in the browser, then installed the app". */
let done = false
export function usePushResync() {
  const cfg = useRuntimeConfig()
  const b64ToU8 = (base64: string) => {
    const pad = '='.repeat((4 - base64.length % 4) % 4)
    const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
  }
  /** The current subscription, created if allowed and missing; null if not allowed here. */
  async function current(): Promise<PushSubscription | null> {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !cfg.public.vapidPublicKey) return null
    if (Notification.permission !== 'granted') return null
    const reg = await navigator.serviceWorker.ready
    return (await reg.pushManager.getSubscription())
      || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(cfg.public.vapidPublicKey) })
  }
  async function resync(force = false) {
    if (done && !force) return null
    done = true
    try {
      const sub = await current()
      if (sub) await $fetch('/api/push/resync', { method: 'POST', body: sub.toJSON() })
      return sub
    } catch { return null }
  }
  /** A push to this device, to prove the chain works end to end. */
  async function test() {
    const sub = await resync(true)
    if (!sub) throw new Error('Δεν έχουν ενεργοποιηθεί οι ειδοποιήσεις σε αυτή τη συσκευή')
    return $fetch<{ sent: number }>('/api/push/test', { method: 'POST', body: { endpoint: sub.endpoint } })
  }
  return { resync, test, current }
}
