const CACHE = 'daybyday-v1'
const PRECACHE = ['/', '/today', '/offline.html']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  // Only handle GET requests to same origin
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return

  const url = new URL(e.request.url)

  // Network-first for API/auth routes
  if (url.pathname.startsWith('/auth') || url.pathname.startsWith('/_next/data')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    )
    return
  }

  // Cache-first for static assets
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons')) {
    e.respondWith(
      caches.match(e.request).then((cached) => cached ?? fetch(e.request).then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return res
      }))
    )
    return
  }

  // Stale-while-revalidate for pages
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return res
      }).catch(() => caches.match('/offline.html'))
      return cached ?? network
    })
  )
})
