/* Imported into the generated service worker: shows pushes, focuses the app on tap. */
self.addEventListener('push', (event) => {
  let data = { title: 'Διαβατήριο Προσκόπου', body: '' }
  try { data = { ...data, ...event.data.json() } } catch {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    lang: 'el'
  }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) return c.focus() }
    return clients.openWindow('/')
  }))
})
