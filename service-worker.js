const CACHE_NAME = "bruchverkauf-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/styles.css",
  "/main.js",
  "/db.js",
  "https://unpkg.com/idb@7/build/umd.js",
  "https://unpkg.com/html5-qrcode/minified/html5-qrcode.min.js",
  "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
