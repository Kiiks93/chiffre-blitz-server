const CACHE = "chiffre-blitz-v5"; // ⬅️ incrémente (v5, v6…) à chaque mise à jour

self.addEventListener("install", () => {
  self.skipWaiting(); // Force l'activation immédiate
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all([
      // 1. Purger les anciens caches
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      ),
      // 2. Prendre le contrôle de tous les clients
      self.clients.claim()
    ]).then(() => {
      // 3. ✅ NOTIFIER tous les clients qu'une nouvelle version est active
      return self.clients.matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ action: "SW_UPDATED", version: CACHE });
          });
        });
    })
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // ✅ Ne PAS intercepter les requêtes cross-origin (API socket.io, /version, etc.)
  if (!e.request.url.startsWith(self.location.origin)) return;

  const url = new URL(e.request.url);
  const isCode =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css") ||
    url.pathname === "/";

  if (isCode) {
    // NETWORK-FIRST : toujours la version fraîche du serveur
    e.respondWith(
      fetch(e.request, { cache: "no-store" })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // CACHE-FIRST pour le reste (images, sons, polices…)
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
