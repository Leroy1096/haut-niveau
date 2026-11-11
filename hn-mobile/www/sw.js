/* Service Worker — Haut Niveau
   Stratégie : coquille du site en cache-first, données Supabase toujours du réseau.
   Ne casse ni la réservation ni l'admin : aucune interception des POST, du domaine
   Supabase, ni des pages admin. */
const VERSION = "hn-v1";
const SHELL = [
  "/", "/index.html",
  "/css/style.css?v=15",
  "/js/main.js?v=15", "/js/config.js?v=15", "/js/data.js?v=15",
  "/js/home.js?v=15", "/images/icon-192.png", "/manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Jamais de cache : POST/PUT…, Supabase (données vivantes), espace Admin, autres hôtes
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/admin")) return;

  // Pages HTML : réseau d'abord, repli cache hors ligne
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request).then((r) => r || caches.match("/index.html")))
    );
    return;
  }

  // Assets (css/js/images) : cache d'abord, mise à jour en arrière-plan
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((resp) => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
