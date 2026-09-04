const CACHE_NAME = "chiffre-blitz-v9";
const BASE = "/";
const CORE_ASSETS = [
  BASE, BASE + "index.html", BASE + "manifest.json",
  BASE + "style.css", BASE + "saisons.css",
  BASE + "i18n.js", BASE + "audio.js", BASE + "son-saisons.js", BASE + "profil.js", BASE + "admin.js",
  BASE + "social.js", BASE + "passe.js", BASE + "saisons.js", BASE + "fx.js", BASE + "jeu.js", BASE + "modes-catch.js",
  BASE + "icons/icon-192.png", BASE + "icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) =>
      Promise.allSettled(CORE_ASSETS.map((a) => c.add(a)))
    )
  );
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
  if (url.hostname.includes("onrender.com") || url.pathname.startsWith("/socket.io")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (e.request.method === "GET" && res.ok && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((c) => c || caches.match(BASE + "index.html"))
      )
  );
});
