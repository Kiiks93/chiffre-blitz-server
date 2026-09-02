/* ============================================================
SERVICE WORKER — Chiffre Blitz (PWA)
Cache les assets, laisse passer le serveur (Render/socket.io)
============================================================ */
const CACHE_NAME = "chiffre-blitz-v2";
const CORE_ASSETS = [
  "./", "index.html", "manifest.json",
  "style.css", "saisons.css",
  "i18n.js", "audio.js", "son-saisons.js", "profil.js", "admin.js",
  "social.js", "passe.js", "saisons.js", "fx.js", "jeu.js", "modes-catch.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Ne JAMAIS cacher le backend (Render) ni socket.io
  if (url.hostname.includes("onrender.com") || url.pathname.startsWith("/socket.io")) return;

  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request)
          .then((res) => {
            // ✅ On ne cache QUE les réponses complètes (pas de 206 partial)
            if (e.request.method === "GET" && res.ok && res.status === 200 && res.type === "basic") {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
            }
            return res;
          })
          .catch(() => caches.match("index.html"))
    )
  );
});
