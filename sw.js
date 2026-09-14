// Service Worker - المركز الإيطالي للأسنان
const CACHE_NAME = 'italian-clinic-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_SHELL);
      })
      .catch(function () { /* تجاهل أي ملف مش موجود وقت التثبيت */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      const networkFetch = fetch(event.request)
        .then(function (networkResponse) {
          // نخزن بس الطلبات من نفس الموقع (الفيرباس/الداتا الحية بره الكاش عشان تفضل لايف)
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            event.request.url.indexOf(self.location.origin) === 0
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(function () {
          return cachedResponse;
        });

      return cachedResponse || networkFetch;
    })
  );
});
