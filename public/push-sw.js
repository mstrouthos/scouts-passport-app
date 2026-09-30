/* Imported into the generated service worker: shows pushes, focuses the app on tap. */
/* Confirm a test push reached this phone: its own subscription says who it is. */
function ackTest(testId) {
  return self.registration.pushManager.getSubscription().then((sub) => sub && fetch('/api/push/ack', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ testId, endpoint: sub.endpoint })
  })).catch(() => {})
}
self.addEventListener('push', (event) => {
  let data = { title: 'Διαβατήριο Προσκόπου', body: '' }
  try { data = { ...data, ...event.data.json() } } catch {}
  // a test push: tell the server this phone really received it
  const ack = data.testId ? ackTest(data.testId) : Promise.resolve()
  event.waitUntil(Promise.all([ack, self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192.png',
    // the small status-bar icon: Android draws only its shape, in white, so
    // it must be a silhouette on transparent — a full-colour icon here shows
    // as a plain white square
    badge: '/icons/badge-96.png',
    lang: 'el',
    // carried through to the click handler so an award opens itself
    data: { url: data.url || '/', testId: data.testId || null }
  })]))
})
/* Android replaces subscriptions now and then; re-create ours and tell the
   server, using the same key, so nobody has to switch anything back on. */
self.addEventListener('pushsubscriptionchange', (event) => {
  const key = event.oldSubscription && event.oldSubscription.options && event.oldSubscription.options.applicationServerKey
  event.waitUntil(self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
    .then((sub) => fetch('/api/push/resync', { method: 'POST', headers: { 'content-type': 'application/json' },
      // the bar's own worker files its subscription under the bar
      body: JSON.stringify({ ...sub.toJSON(), surface: /\/bar\/?$/.test(self.registration.scope) ? 'bar' : 'scouts' }) }))
    .catch(() => {}))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  // a test: tapping it confirms it too
  const testId = event.notification.data && event.notification.data.testId
  if (testId) event.waitUntil(ackTest(testId))
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if ('focus' in c) {
        // an already-open app is focused and steered, not opened twice
        if ('navigate' in c && url !== '/') return c.focus().then((w) => w.navigate(url))
        return c.focus()
      }
    }
    return clients.openWindow(url)
  }))
})
