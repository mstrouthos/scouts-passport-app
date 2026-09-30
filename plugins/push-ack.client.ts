/* A test notification opened: the app confirms it was received, with this
   phone's own subscription. The service worker does this too; this covers a
   phone still running the previous one. Runs before any page can redirect. */
export default defineNuxtPlugin(() => {
  const url = new URL(window.location.href)
  const testId = url.searchParams.get('pushAck')
  if (!testId) return
  url.searchParams.delete('pushAck')
  history.replaceState(history.state, '', url.pathname + url.search + url.hash)
  if (!('serviceWorker' in navigator)) return
  pushRegistration(url.pathname)
    .then(reg => reg.pushManager.getSubscription())
    .then(sub => sub && $fetch('/api/push/ack', { method: 'POST', body: { testId, endpoint: sub.endpoint } }))
    .catch(() => {})
})
