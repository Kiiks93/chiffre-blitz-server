/* ============================================================
SW.JS — Service Worker Chiffre Blitz
Ne met PAS en cache les fichiers admin pour éviter les stale caches
============================================================ */

const CACHE_NAME = 'chiffre-blitz-v3';
const NO_CACHE = [
    '/admin.html',
    '/admin.js',
    '/sw.js'
];

// Fichiers à mettre en cache pour le jeu principal
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json'
];

// ============================================================
// INSTALL
// ============================================================
self.addEventListener('install', (event) => {
    console.log('[sw] Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// ============================================================
// ACTIVATE — nettoie les anciens caches
// ============================================================
self.addEventListener('activate', (event) => {
    console.log('[sw] Activate');
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k !== CACHE_NAME)
                    .map((k) => {
                        console.log('[sw] Suppression ancien cache :', k);
                        return caches.delete(k);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// ============================================================
// FETCH — Network first pour admin, Cache first pour le reste
// ============================================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const pathname = url.pathname;

    // ❌ JAMAIS mettre en cache les fichiers admin
    if (NO_CACHE.some((p) => pathname.endsWith(p) || pathname === p)) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' })
                .catch(() => new Response('Hors ligne — Admin indisponible', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' }
                }))
        );
        return;
    }

    // ❌ JAMAIS mettre en cache les fichiers .js (toujours réseau)
    if (pathname.endsWith('.js')) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' })
                .then((response) => {
                    if (response.ok && event.request.method === 'GET') {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // ✅ Cache first pour les assets statiques (images, CSS, fonts)
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (response.ok && event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});

// ============================================================
// MESSAGE — permet au client de demander un skipWaiting
// ============================================================
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[sw] Cache vidé');
        });
    }
});
