// Only the offline document is cached. Match data and account responses stay online.
const CACHE = 'apex-offline-v1'
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add('/offline.html')))
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(key => key.startsWith('apex-offline-') && key !== CACHE).map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith(fetch(event.request).catch(async () => {
    return (await caches.match('/offline.html')) || new Response('Apex est hors connexion.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }))
})
