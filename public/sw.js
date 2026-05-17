/* ──────────────────────────────────────────────────────────
   SOCIO PWA — Service Worker v4
   • Cache-first for immutable Next.js bundles (/_next/static/)
   • Network-only for API traffic (backend Valkey is authoritative)
   • Cache-first for core static assets/images/fonts/CSS
   • Network-first for navigations and next data routes
   ──────────────────────────────────────────────────────────
   NOTE: OneSignal push is handled by its own dedicated workers:
     /OneSignalSDKWorker.js
     /OneSignalSDKUpdaterWorker.js
   Do NOT add OneSignal importScripts here.
   ────────────────────────────────────────────────────────── */

const CACHE_STATIC = "socio-static-v6";   // Next.js chunks, fonts, CSS
const CACHE_PAGES = "socio-pages-v6";     // HTML navigations
const CACHE_IMAGES = "socio-images-v6";   // images
const OFFLINE_URL = "/offline";

const ALL_CACHES = [CACHE_STATIC, CACHE_PAGES, CACHE_IMAGES];

const CORE_ROUTES = [
  "/",
  "/offline",
  "/offline.html",
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
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !ALL_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
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
      caches.match(request, { ignoreSearch: true }).then(
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
        .catch(() => caches.match(request, { ignoreSearch: true }))
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
            .match(request, { ignoreSearch: true })
            .then((r) => r || caches.match(OFFLINE_URL, { ignoreSearch: true }))
            .then((r) => r || caches.match("/offline.html", { ignoreSearch: true }))
            .then((r) => r || caches.match("/", { ignoreSearch: true }))
            .then((r) => r || new Response(
              "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Offline - SOCIO</title><style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb;color:#111827;text-align:center;padding:20px}svg{width:64px;height:64px;color:#9ca3af;margin-bottom:16px}h1{font-size:1.5rem;font-weight:700;margin-bottom:8px}p{font-size:0.875rem;color:#6b7280;margin-bottom:24px}.btn{background:#1a3a7a;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.875rem}</style></head><body><svg fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 3l18 18m-2.286-2.286A8.953 8.953 0 0112 21a8.953 8.953 0 01-6.714-2.286M5.586 15.586a5 5 0 010-7.072M2.757 12.757a9.002 9.002 0 011.664-2.454M12 9v.01M16.414 16.414A5 5 0 0019 12M19.243 9.243a9.002 9.002 0 00-1.664-2.454'></path></svg><h1>Offline Mode</h1><p>You are currently offline and this page is not cached.</p><a href='/' class='btn'>Go to Home</a></body></html>",
              { headers: { "Content-Type": "text/html" } }
            ))
        )
    );
    return;
  }

  /* 5. Images — cache-first */
  if (isImage(request)) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(
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
      caches.match(request, { ignoreSearch: true }).then(
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

/* ── Push notifications are now handled by OneSignalSDK.sw.js ── */
