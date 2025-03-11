const CACHE_NAME = 'quranic-wisdom-v2';
const ASSETS = [
  '/Quran/',
  '/Quran/index.html',
  '/Quran/style.css',
  '/Quran/script.js',
  '/Quran/img/logo.png',
  // Add other assets with full paths
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
});
