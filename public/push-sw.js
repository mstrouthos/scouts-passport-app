/* Imported into the generated service worker: shows pushes, focuses the app on tap. */
self.addEventListener('push', (event) => {
  let data = { title: 'Διαβατήριο Προσκόπου', body: '' }
  try { data = { ...data, ...event.data.json() } } catch {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    lang: 'el',
    // carried through to the click handler so an award opens itself
    data: { url: data.url || '/' }
  }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
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
