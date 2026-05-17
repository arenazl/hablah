// AgentFlow Service Worker — Web Push + click handler

self.addEventListener('install', (event) => {
  console.log('[SW] install')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] activate')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = { title: 'AgentFlow', body: 'Tenes una notificacion' }
  try {
    if (event.data) data = event.data.json()
  } catch (e) {
    if (event.data) data.body = event.data.text()
  }

  const title = data.title || 'AgentFlow'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'agentflow-default',
    data: { url: data.url || '/inbox' },
    renotify: true,
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/inbox'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una pestania abierta en el origen, navegar ahi
      for (const client of clientList) {
        const url = new URL(client.url)
        if (url.origin === self.location.origin) {
          client.focus()
          if ('navigate' in client) {
            return client.navigate(targetUrl)
          }
          return
        }
      }
      // Sino abrir nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
