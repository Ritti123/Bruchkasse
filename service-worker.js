{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 const CACHE_NAME = 'bruchverkauf-v1';\
const urlsToCache = [\
  './',\
  './index.html',\
  './styles.css',\
  './main.js',\
  './db.js',\
  'https://unpkg.com/idb@7/build/umd.js',\
  'https://unpkg.com/html5-qrcode/minified/html5-qrcode.min.js',\
  'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'\
];\
\
self.addEventListener('install', (event) => \{\
  event.waitUntil(\
    caches.open(CACHE_NAME)\
      .then((cache) => cache.addAll(urlsToCache))\
  );\
\});\
\
self.addEventListener('fetch', (event) => \{\
  event.respondWith(\
    caches.match(event.request)\
      .then((response) => \{\
        // Cache treffer - return response\
        if (response) \{\
          return response;\
        \}\
\
        // Kein Cache treffer - network request\
        return fetch(event.request).then((response) => \{\
          // Check if valid response\
          if (!response || response.status !== 200 || response.type !== 'basic') \{\
            return response;\
          \}\
\
          // Response klonen\
          const responseToCache = response.clone();\
\
          caches.open(CACHE_NAME)\
            .then((cache) => \{\
              cache.put(event.request, responseToCache);\
            \});\
\
          return response;\
        \});\
      \}\
    )\
  );\
\});\
\
self.addEventListener('activate', (event) => \{\
  event.waitUntil(\
    caches.keys().then((cacheNames) => \{\
      return Promise.all(\
        cacheNames.map((cacheName) => \{\
          if (cacheName !== CACHE_NAME) \{\
            return caches.delete(cacheName);\
          \}\
        \})\
      );\
    \})\
  );\
\});}