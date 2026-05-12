/* ──────────────────────────────────────────────────────────
   SOCIO PWA — Service Worker v4
   • Cache-first for immutable Next.js bundles (/_next/static/)
   • Network-only for API traffic (backend Valkey is authoritative)
   • Cache-first for core static assets/images/fonts/CSS
   • Network-first for navigations and next data routes
   ────────────────────────────────────────────────────────── */

const CACHE_STATIC = "socio-static-v5";   // Next.js chunks, fonts, CSS
const CACHE_PAGES = "socio-pages-v5";     // HTML navigations
const CACHE_IMAGES = "socio-images-v5";   // images
const OFFLINE_URL = "/offline";

const ALL_CACHES = [CACHE_STATIC, CACHE_PAGES, CACHE_IMAGES];

const CORE_ROUTES = [
  "/",
  "/offline",
  "/auth",
  "/discover",
  "/events",
  "/fests",
  "/notifications",
  "/privacy",
  "/terms",
];

const STATIC_SHELL_ASSETS = [
  "/manifest.json",
  "/applogo.png",
  "/logo.svg",
  "/favicon.svg",
];

const PRECACHE_URLS = [...new Set([...CORE_ROUTES, ...STATIC_SHELL_ASSETS])];
const SENSITIVE_API_PATTERNS = ["/scan-qr", "/volunteer/", "/users/me", "/auth/", "/roles/", "/permissions/"];

const CACHE_AUDIT = {
  enabled: false,
  counters: {
    staticHit: 0,
    staticMiss: 0,
    imageHit: 0,
    imageMiss: 0,
    pageHit: 0,
    pageMiss: 0,
    apiNetworkOnly: 0,
    apiSensitiveBypass: 0,
    navigationFallback: 0,
  },
};

function logCacheAudit(event, details = {}) {
  if (!CACHE_AUDIT.enabled) return;
  console.log(`[CacheAudit] ${event}`, details);
}

/* ── Install — pre-cache shell ── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_PAGES).then((cache) =>
      Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: "reload" })))
      )
    )
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

function isSameOrigin(url) {
  return new URL(url).origin === self.location.origin;
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
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  const origin = parsed.origin;
  const isBackend = 
    origin === "https://socio2026v2server.vercel.app" ||
    hostname.endsWith(".vercel.app") || 
    hostname === "localhost" || 
    hostname === "127.0.0.1";
    
  return url.includes("/api/pwa/") || (isBackend && parsed.pathname.startsWith("/api/"));
}

function isCoreRoutePath(pathname) {
  if (CORE_ROUTES.includes(pathname)) return true;
  if (pathname.startsWith("/event/")) return true;
  if (pathname.startsWith("/fest/")) return true;
  return false;
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
        (cached) => {
          if (cached) {
            CACHE_AUDIT.counters.staticHit += 1;
            return cached;
          }
          CACHE_AUDIT.counters.staticMiss += 1;
          return fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_STATIC).then((c) => c.put(request, clone));
            }
            return res;
          });
        }
      )
    );
    return;
  }

  /* 2. API requests — network-only.
     Backend Valkey is the authoritative read cache; SW only handles offline/static assets. */
  if (isAPIRoute(url)) {
    CACHE_AUDIT.counters.apiNetworkOnly += 1;
    const lowercaseUrl = url.toLowerCase();
    if (SENSITIVE_API_PATTERNS.some((pattern) => lowercaseUrl.includes(pattern))) {
      CACHE_AUDIT.counters.apiSensitiveBypass += 1;
      logCacheAudit("sw-sensitive-api-bypass", { url });
    }
    event.respondWith(fetch(request).catch(() => new Response("{}", { status: 504 })));
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

  /* 4. Navigation — network-first to avoid stale HTML hydration mismatches */
  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_PAGES).then((c) => c.put(request, clone));
          }
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
        (cached) => {
          if (cached) {
            CACHE_AUDIT.counters.imageHit += 1;
            return cached;
          }
          CACHE_AUDIT.counters.imageMiss += 1;
          return fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_IMAGES).then((c) => c.put(request, clone));
            }
            return res;
          });
        }
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

/* ── Runtime controls ── */
self.addEventListener("message", (event) => {
  if (event?.data === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event?.data === "WARM_CACHE") {
    event.waitUntil(
      caches.open(CACHE_PAGES).then((cache) =>
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
      )
    );
    return;
  }

  if (event?.data === "CACHE_AUDIT_ENABLE") {
    CACHE_AUDIT.enabled = true;
    logCacheAudit("sw-cache-audit-enabled", { counters: CACHE_AUDIT.counters });
    return;
  }

  if (event?.data === "CACHE_AUDIT_DISABLE") {
    CACHE_AUDIT.enabled = false;
    return;
  }

  if (event?.data === "CACHE_AUDIT_DUMP") {
    logCacheAudit("sw-cache-audit-dump", { counters: CACHE_AUDIT.counters });
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
