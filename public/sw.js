/* ──────────────────────────────────────────────────────────
   SOCIO PWA — Service Worker v3
   • Cache-first for immutable Next.js bundles (/_next/static/)
   • Stale-while-revalidate for API data
   • Network-first for navigations with offline fallback
   • Cache-first for images / fonts / CSS
   ────────────────────────────────────────────────────────── */

const CACHE_STATIC = "socio-static-v3";   // Next.js chunks, fonts, CSS
const CACHE_PAGES = "socio-pages-v3";     // HTML navigations
const CACHE_IMAGES = "socio-images-v3";   // images
const CACHE_API = "socio-api-v3";         // API data (stale-while-revalidate)
const OFFLINE_URL = "/offline";

const ALL_CACHES = [CACHE_STATIC, CACHE_PAGES, CACHE_IMAGES, CACHE_API];

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/discover",
  "/events",
  "/fests",
  "/manifest.json",
];

/* ── Install — pre-cache shell ── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_PAGES).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

/* ── Activate — clean old caches ── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !ALL_CACHES.includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Helpers ── */
function isNavigation(request) {
  return request.mode === "navigate";
}

function isNextStatic(url) {
  return url.includes("/_next/static/");
}

function isNextData(url) {
  return url.includes("/_next/data/");
}

function isImage(request) {
  return (
    request.destination === "image" ||
    /\.(png|jpg|jpeg|gif|webp|avif|svg|ico)(\?|$)/i.test(request.url)
  );
}

function isStaticAsset(request) {
  return ["style", "script", "font"].includes(request.destination);
}

function isAPIRoute(url) {
  return url.includes("/api/pwa/");
}

/* ── Fetch handler ── */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET
  if (request.method !== "GET") return;

  // Never touch auth routes
  if (request.url.includes("/auth/callback")) return;

  const url = request.url;

  /* 1. Next.js immutable static bundles — cache-first (they're fingerprinted) */
  if (isNextStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_STATIC).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  /* 2. API data — stale-while-revalidate */
  if (isAPIRoute(url)) {
    event.respondWith(
      caches.open(CACHE_API).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            })
            .catch(() => cached || new Response("{}", { status: 504 }));

          return cached || networkFetch;
        })
      )
    );
    return;
  }

  /* 3. Next.js data routes (ISR JSON) — network-first, cache fallback */
  if (isNextData(url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_PAGES).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  /* 4. Navigation — network-first, offline fallback */
  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_PAGES).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((r) => r || caches.match(OFFLINE_URL))
            .then((r) => r || caches.match("/"))
        )
    );
    return;
  }

  /* 5. Images — cache-first */
  if (isImage(request)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_IMAGES).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  /* 6. Other static assets (CSS, JS, fonts) — cache-first */
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_STATIC).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }
});

/* ── Push notifications ── */
self.addEventListener("push", (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return { body: event.data ? event.data.text() : "" };
    }
  })();

  const title = payload.title || "SOCIO";
  const options = {
    body: payload.body || "You have a new update.",
    icon: payload.icon || "/logo.svg",
    badge: payload.badge || "/logo.svg",
    tag: payload.tag || "socio-notification",
    data: {
      url: payload.url || payload.actionUrl || "/notifications",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/notifications";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
