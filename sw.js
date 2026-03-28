const CACHE_NAME = 'gem-z-cache-v1';
const OFFLINE_URL = '/trainee';

const urlsToCache = [
    '/',
    '/trainee',
    '/manifest.json',
    '/favicon.ico',
    // In a real app we'd cache CSS/JS bundles dynamically using Workbox
];

// Install Event - aggressive initial cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Caching offline shell');
            return cache.addAll(urlsToCache);
        })
    );
    // Force waiting SW to immediately become active
    self.skipWaiting();
});

// Activate Event - cleanup old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[ServiceWorker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Take control of all clients immediately
    self.clients.claim();
});

// Fetch Event - Stale-while-revalidate for API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Handle API requests (Network first, then fallback to cache)
    if (event.request.url.includes('/api/v1/')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, resClone);
                    });
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Handle page navigations & static assets (Cache first, then network)
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(() => {
                // Fallback to offline page for document navigations
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
            });
        })
    );
});
