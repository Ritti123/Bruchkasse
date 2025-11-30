const CACHE_NAME = "bruch-kassensystem-v1"
const urlsToCache = ["/", "/manifest.json", "/icon-192.jpg", "/icon-512.jpg"]

// Installation - Cache alle wichtigen Dateien
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Öffne Cache")
      return cache.addAll(urlsToCache)
    }),
  )
  // Sofort aktivieren
  self.skipWaiting()
})

// Aktivierung - Alte Caches löschen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[SW] Lösche alten Cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  // Sofort alle Clients übernehmen
  return self.clients.claim()
})

// Fetch - Network First, fallback to Cache
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone die Response weil sie nur einmal verwendet werden kann
        const responseToCache = response.clone()

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
      .catch(() => {
        // Wenn Netzwerk fehlschlägt, versuche aus Cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response
          }
          // Fallback für nicht gecachte Requests
          return new Response("Offline - Resource nicht verfügbar", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({
              "Content-Type": "text/plain",
            }),
          })
        })
      }),
  )
})
