/* global self, clients */

const FALLBACK_TARGET = '/app'

function safeTarget(value) {
  if (typeof value !== 'string') return FALLBACK_TARGET
  if (/^\/app\/conversas\/[0-9a-f-]{36}$/i.test(value)) return value
  if (value === '/app/agenda' || value.startsWith('/app/agenda?')) return value
  return FALLBACK_TARGET
}

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload
    try { payload = event.data?.json() }
    catch { return }
    if (!payload || typeof payload.title !== 'string' || typeof payload.body !== 'string') return

    const targetPath = safeTarget(payload.target_path)
    const openClients = await clients.matchAll({type:'window',includeUncontrolled:true})
    if (openClients.length > 0) {
      for (const client of openClients) {
        client.postMessage({type:'ALOVIA_WEB_PUSH_EVENT',target_path:targetPath})
      }
      return
    }

    await self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/app-icon-192.png',
      badge: '/app-icon-192.png',
      tag: typeof payload.event_id === 'string' ? payload.event_id : undefined,
      renotify: false,
      data: {target_path: targetPath},
    })
  })())
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const targetPath = safeTarget(event.notification.data?.target_path)
    const targetUrl = new URL(targetPath, self.location.origin).href
    const openClients = await clients.matchAll({type:'window',includeUncontrolled:true})
    const existing = openClients.find(client => client.url.startsWith(self.location.origin))
    if (existing) {
      await existing.navigate(targetUrl)
      return existing.focus()
    }
    return clients.openWindow(targetUrl)
  })())
})
