  self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('quranic-wisdom-v1').then(cache => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                '/style.css',
                '/script.js',
                'https://learnarabicfree.github.io/Quran/img/logo.png',
                // Add other assets you want to cache
            ]);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
});
