/* ──────────────────────────────────────────────────────────────────────────────
   SOCIO PWA — Service Worker (VAPID Web Push)
   Production-grade Android notification presentation
   ────────────────────────────────────────────────────────────────────────────── */

/* ── Icon paths ── */
const ICON_192  = "/icons/icon-192x192.png";
const BADGE_72  = "/icons/badge-72x72.png";

/* ── Category → Android notification group tag ──────────────────────────────
 * Android stacks notifications that share the same group tag into a
 * collapsible bundle — matching the behaviour of WhatsApp, Gmail, etc.
 */
const GROUP_TAG = {
  event:      "socio-group-events",
  events:     "socio-group-events",
  reminder:   "socio-group-events",
  admin:      "socio-group-admin",
  broadcast:  "socio-group-admin",
  info:       "socio-group-admin",
  success:    "socio-group-admin",
  warning:    "socio-group-admin",
  chat:       "socio-group-chat",
  message:    "socio-group-chat",
  workflow:   "socio-group-workflow",
  approval:   "socio-group-workflow",
  diagnostic: "socio-group-diagnostic",
};

/* ── Category → vibration pattern ─────────────────────────────────────────── */
const VIBRATION = {
  event:    [300, 100, 300, 100, 200],
  events:   [300, 100, 300, 100, 200],
  reminder: [300, 100, 300, 100, 200],
  chat:     [100, 50,  100],
  workflow: [200, 100, 200, 100, 200],
  default:  [200, 100, 200],
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function resolveAbsoluteUrl(relativeOrAbsolute) {
  try {
    // Already absolute
    new URL(relativeOrAbsolute);
    return relativeOrAbsolute;
  } catch {
    // Relative path — prepend SW scope origin
    return self.location.origin + (relativeOrAbsolute.startsWith("/") ? "" : "/") + relativeOrAbsolute;
  }
}

function getGroupTag(category) {
  return GROUP_TAG[String(category || "").toLowerCase()] || "socio-group-general";
}

function getVibration(category) {
  return VIBRATION[String(category || "").toLowerCase()] || VIBRATION.default;
}

/* ─────────────────────────────────────────────────────────────────────────────
   LIFECYCLE
   ───────────────────────────────────────────────────────────────────────── */

self.addEventListener("install", () => {
  console.log("[PUSH] SW installing — skipping waiting to activate immediately");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[PUSH] SW activated — claiming all clients");
  event.waitUntil(self.clients.claim());
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUSH RECEIVED
   ───────────────────────────────────────────────────────────────────────── */

self.addEventListener("push", (event) => {
  console.log("[PUSH] Push received");

  /* ── 1. Parse payload — safe with full fallback chain ── */
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (jsonErr) {
    console.warn("[PUSH] JSON parse failed, attempting text fallback:", jsonErr);
    try {
      const text = event.data ? event.data.text() : "";
      data = { body: text, title: "SOCIO" };
    } catch (textErr) {
      console.error("[PUSH] Text parse also failed:", textErr);
    }
  }

  /* ── 2. Extract fields with sensible defaults ── */
  const title          = (data.title || "SOCIO").slice(0, 100);
  const body           = (data.body || data.message || "New activity on SOCIO").slice(0, 300);
  const category       = (data.category || data.type || "info").toLowerCase();
  const priority       = (data.priority || "normal").toLowerCase();
  const notificationId = data.notificationId || data.tag || data.id || null;
  const route          = data.actionUrl || data.deepLink || data.route || "/notifications";
  const image          = data.image || undefined;
  const userEmail      = data.userEmail || undefined;

  /* ── 3. Build per-category notification tag for Android grouping ──
   *  Format: {groupPrefix}-{notificationId}
   *  This causes Android to stack multiple notifications from the same
   *  category (e.g. multiple event reminders) under one expandable bundle.
   */
  const groupTag = getGroupTag(category);
  const tag      = notificationId ? `${groupTag}-${notificationId}` : groupTag;

  /* ── 4. Build the notification options object ── */
  const options = {
    body,

    /* Icon: shown as the large notification icon (must be ≥192px for clarity on high-dpi Android) */
    icon: data.icon || ICON_192,

    /* Badge: tiny monochrome icon shown in Android status bar (must be ≤72px, white-on-transparent) */
    badge: data.badge || BADGE_72,

    /* Image: optional large image displayed below the body (used for event banners, etc.) */
    image,

    /* Tag: enables Android-style stacking — same tag replaces / stacks the notification */
    tag,

    /* renotify: re-trigger vibration/sound even if replacing an existing notification with same tag */
    renotify: true,

    /* requireInteraction: keeps notification alive on lock screen until user explicitly interacts.
     * Only set for high-priority pushes (event deadlines, admin alerts). */
    requireInteraction: priority === "high",

    /* timestamp: used by Android to sort notifications and display relative time */
    timestamp: data.timestamp || Date.now(),

    /* silent: always false so the device plays the default notification sound */
    silent: false,

    /* vibrate: pattern in ms — on, off, on, off … */
    vibrate: data.vibrate || getVibration(category),

    /* data: passed through to the notificationclick handler */
    data: {
      url:            route,
      notificationId: notificationId,
      category:       category,
      priority:       priority,
      userEmail:      userEmail,
      groupTag:       groupTag,
    },

    /* actions: rendered as buttons below the notification body on Android.
     * Max 2 actions are shown on most Android launchers. */
    actions: [
      { action: "open",    title: "Open"    },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  /* ── 5. Check if app is currently in foreground ──
   * If a visible window exists, we skip showing the native notification
   * and instead send a silent foreground sync message so the app can
   * silently update its unread badge — no ugly overlay popup.
   */
  const promise = (async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

    const hasVisibleClient = clients.some(c => c.visibilityState === "visible");

    if (hasVisibleClient) {
      console.log("[PUSH] App is in foreground — skipping native notification; sending silent sync");
      for (const client of clients) {
        try {
          client.postMessage({
            type:           "socio:foregroundSync",
            title,
            body,
            route,
            tag,
            category,
            priority,
            notificationId,
            userEmail,
            icon:           options.icon,
            badge:          options.badge,
          });
        } catch (msgErr) {
          console.warn("[PUSH] postMessage to foreground client failed:", msgErr);
        }
      }
      return; // ← skip showNotification entirely
    }

    /* ── 6. App not visible — show the native Android notification ── */
    try {
      await self.registration.showNotification(title, options);
      console.log("[PUSH] Notification rendered —", `tag=${tag}`, `category=${category}`, `priority=${priority}`);
    } catch (showErr) {
      console.error("[PUSH] showNotification failed:", showErr);
      /* Graceful fallback: minimal notification to prevent silent failure */
      try {
        await self.registration.showNotification(title, {
          body,
          icon: ICON_192,
          badge: BADGE_72,
          data: { url: route, notificationId },
        });
        console.log("[PUSH] Notification rendered (fallback minimal options)");
      } catch (fallbackErr) {
        console.error("[PUSH] Fallback showNotification also failed:", fallbackErr);
      }
    }

    /* ── 7. Also broadcast to any background/hidden app windows so they
     * can silently refresh their unread count without user seeing a toast */
    for (const client of clients) {
      try {
        client.postMessage({
          type:           "socio:foregroundNotification",
          title,
          body,
          route,
          tag,
          category,
          priority,
          notificationId,
          userEmail,
          icon:           options.icon,
          badge:          options.badge,
        });
      } catch (msgErr) {
        console.warn("[PUSH] Background client postMessage failed:", msgErr);
      }
    }
  })();

  event.waitUntil(promise);
});

/* ─────────────────────────────────────────────────────────────────────────────
   NOTIFICATION CLICK
   ───────────────────────────────────────────────────────────────────────── */

self.addEventListener("notificationclick", (event) => {
  const notification   = event.notification;
  const action         = event.action;
  const notifData      = notification.data || {};
  const notificationId = notifData.notificationId;
  const category       = notifData.category || "general";

  /* Close the notification immediately */
  notification.close();

  /* Handle dismiss action — close only, no navigation */
  if (action === "dismiss") {
    console.log(`[PUSH] Notification dismissed via action button — id=${notificationId}`);
    return;
  }

  /* Resolve target URL — must be absolute for client.navigate() and clients.openWindow() */
  const rawUrl    = notifData.url || "/notifications";
  const targetUrl = resolveAbsoluteUrl(rawUrl);

  console.log(`[PUSH] Notification clicked — id=${notificationId}, action=${action || "body"}, category=${category}`);
  console.log(`[PUSH] Deep link routed → ${targetUrl}`);

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type:               "window",
        includeUncontrolled: true,
      });

      /* ── Try to reuse an existing PWA window ── */
      for (const client of allClients) {
        try {
          const clientOrigin = new URL(client.url).origin;
          if (clientOrigin === self.location.origin) {
            /* Focus the existing window */
            await client.focus();
            console.log("[PUSH] Existing client focused");

            /* Navigate it to the deep-link route */
            if (typeof client.navigate === "function") {
              await client.navigate(targetUrl);
              console.log("[PUSH] Existing client navigated to:", targetUrl);
            } else {
              /* navigate() not available (older browsers): fall back to postMessage */
              client.postMessage({
                type: "socio:notificationClick",
                url:  targetUrl,
                notificationId,
                category,
              });
              console.log("[PUSH] Existing client notified via postMessage (navigate() unavailable)");
            }
            return;
          }
        } catch (err) {
          console.warn("[PUSH] Failed to reuse existing client window:", err);
        }
      }

      /* ── No existing window — open a new standalone PWA window ── */
      console.log("[PUSH] No existing client found — opening new PWA window");
      try {
        await self.clients.openWindow(targetUrl);
        console.log("[PUSH] New client opened at:", targetUrl);
      } catch (openErr) {
        console.error("[PUSH] clients.openWindow failed:", openErr);
      }
    })()
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   NOTIFICATION CLOSE (user swiped away)
   ───────────────────────────────────────────────────────────────────────── */

self.addEventListener("notificationclose", (event) => {
  const notifData      = event.notification?.data || {};
  const notificationId = notifData.notificationId;
  const category       = notifData.category || "general";
  console.log(`[PUSH] Notification dismissed — id=${notificationId}, category=${category}`);
});
