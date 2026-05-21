/* ──────────────────────────────────────────────────────────────────────────────
   SOCIO PWA — Service Worker (VAPID Web Push)
   Production-grade Android notification presentation + delivery optimization
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
   PUSH SUBSCRIPTION CHANGE
   ───────────────────────────────────────────────────────────────────────────
   Google rotates push endpoints periodically (especially after Chrome updates
   or when the subscription expires). Without this handler, the old endpoint
   silently stops delivering — the backend never learns about the new endpoint.

   This handler:
   1. Subscribes with the new keys automatically
   2. Posts a message to the app (if open) so it can re-register with the backend
   3. Falls back gracefully if the page is not open
   ─────────────────────────────────────────────────────────────────────────── */
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[PUSH] pushsubscriptionchange fired — subscription rotated by browser");

  const resubscribe = async () => {
    try {
      const vapidPublicKey = self.__VAPID_PUBLIC_KEY__;

      // Try to re-subscribe with existing applicationServerKey if available
      const newSubscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        ...(vapidPublicKey ? { applicationServerKey: vapidPublicKey } : {}),
      });

      console.log("[PUSH] pushsubscriptionchange: resubscribed to new endpoint:", newSubscription.endpoint.substring(0, 50) + "...");

      // Notify the open page so it can re-register the new subscription on the backend.
      // If no page is open, the NotificationContext will re-register on next boot via
      // the localStorage subscription re-registration flow.
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        try {
          client.postMessage({
            type:            "socio:subscriptionRotated",
            newSubscription: newSubscription.toJSON(),
          });
        } catch (msgErr) {
          console.warn("[PUSH] pushsubscriptionchange: postMessage to client failed:", msgErr);
        }
      }

      // Persist new subscription in clients' localStorage via message is not possible
      // from SW. The page handler (NotificationContext) will store & register it.
    } catch (err) {
      console.error("[PUSH] pushsubscriptionchange: resubscribe failed:", err);
    }
  };

  event.waitUntil(resubscribe());
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUSH RECEIVED
   ───────────────────────────────────────────────────────────────────────── */

self.addEventListener("push", (event) => {
  /* High-res receive timestamp — used to measure SW→render latency below */
  const receivedAt = Date.now();
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

  /* ── 2. Delivery latency instrumentation ──
   * Backend injects sentAt: Date.now() into every payload.
   * Measures: backend → Google Push Service → Chrome → SW wake-up.
   * Check Chrome DevTools → Application → Service Workers → Console.
   */
  if (data.sentAt) {
    const deliveryLatencyMs = receivedAt - data.sentAt;
    console.log(`[PUSH] Delivery latency: ${deliveryLatencyMs}ms (backend→SW)`);
    if (deliveryLatencyMs > 30000) {
      console.warn(`[PUSH] HIGH LATENCY DETECTED: ${deliveryLatencyMs}ms — Android may be in Doze mode. Check battery optimization settings.`);
    }
  }

  /* ── 3. Extract fields with sensible defaults ── */
  const title          = (data.title || "SOCIO").slice(0, 100);
  const body           = (data.body || data.message || "New activity on SOCIO").slice(0, 300);
  const category       = (data.category || data.type || "info").toLowerCase();
  const priority       = (data.priority || "normal").toLowerCase();
  const notificationId = data.notificationId || data.tag || data.id || null;
  const route          = data.actionUrl || data.deepLink || data.route || "/notifications";
  const image          = data.image || undefined;
  const userEmail      = data.userEmail || undefined;

  /* ── 4. Notification tag strategy ──
   *
   * TAG RULES (critical for Android stacking vs. replacing behaviour):
   *
   *   │ Situation                        │ Tag used                          │ Result            │
   *   ├──────────────────────────────────┼───────────────────────────────────┼──────────────────│
   *   │ notificationId present           │ {groupTag}-{notificationId}       │ same ID replaces  │
   *   │ notificationId missing (generic) │ {groupTag}-{ts}-{rand}            │ always stacks     │
   *
   * WHY THIS MATTERS:
   *   The previous code fell back to plain `groupTag` (e.g. "socio-group-admin")
   *   when notificationId was absent. Every generic broadcast then shared the
   *   same tag — each new one silently replaced the previous, making it look
   *   like "only one notification ever appears".
   *
   * RENOTIFY RULE:
   *   renotify: true  → only when intentionally updating an existing notification
   *                       (same notificationId → same tag). Re-fires vibration/sound.
   *   renotify: false → for unique tags (every notification is brand-new; renotify
   *                       would be a no-op anyway but false is semantically correct).
   */
  const groupTag         = getGroupTag(category);
  const isIntentionalUpdate = Boolean(notificationId); // has a real DB id — may replace old
  const uniqueSuffix     = isIntentionalUpdate
    ? notificationId                                    // intentional: same id → same tag → replace
    : `${receivedAt}-${Math.random().toString(36).slice(2, 7)}`; // unique: always stack
  const tag              = `${groupTag}-${uniqueSuffix}`;

  /* ── 5. Build the notification options object ── */
  const options = {
    body,

    /* Icon: shown as the large notification icon (≥192px for high-dpi Android) */
    icon: data.icon || ICON_192,

    /* Badge: tiny monochrome icon in Android status bar (≤72px, white-on-transparent) */
    badge: data.badge || BADGE_72,

    /* Image: optional large banner image (event banners, etc.) */
    image,

    /* Tag: unique per notification — notifications stack independently.
     * Same notificationId → same tag → intentional replace (e.g. event update). */
    tag,

    /* renotify: true only for intentional updates to an existing notification.
     * With unique tags, this is false — each notification is always brand-new. */
    renotify: isIntentionalUpdate,

    /* requireInteraction: pin to lock screen only for high-priority alerts */
    requireInteraction: priority === "high",

    /* timestamp: Android uses this to sort notifications in the tray */
    timestamp: data.timestamp || receivedAt,

    /* silent: false — always play default system notification sound */
    silent: false,

    /* vibrate: haptic pattern — matched to notification category */
    vibrate: data.vibrate || getVibration(category),

    /* data: forwarded to the notificationclick handler */
    data: {
      url:            route,
      notificationId: notificationId,
      category:       category,
      priority:       priority,
      userEmail:      userEmail,
      groupTag:       groupTag,
      receivedAt:     receivedAt,
    },

    /* actions: buttons below the notification body (max 2 on most Android launchers) */
    actions: [
      { action: "open",    title: "Open"    },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  /* ── 6. Always show native Android notification (WhatsApp/Instagram UX) ──
   *
   * DESIGN DECISION (Option B — WhatsApp/Instagram UX):
   *   - ALWAYS show the native Android notification, even if the app is open
   *     in the foreground. This matches the behaviour of WhatsApp, Instagram,
   *     Discord, and Gmail on Android.
   *
   * We still send foregroundSync to all windows so they can silently refresh
   * their unread badge — but this NEVER suppresses the native notification.
   *
   * Why this matters:
   *   The previous "skip if foreground" logic caused users to miss notifications
   *   whenever the PWA happened to be open, making delivery feel inconsistent.
   *   Always showing ensures 100% of pushes appear in the Android tray.
   */
  const promise = (async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

    /* ── Always send foregroundSync to ALL windows (for badge/count refresh) ── */
    const syncMsg = {
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
    };
    for (const client of clients) {
      try { client.postMessage(syncMsg); } catch (msgErr) {
        console.warn("[PUSH] postMessage to client failed:", msgErr);
      }
    }

    const isForeground = clients.some(c => c.visibilityState === "visible");
    console.log(`[PUSH] App state: ${isForeground ? "foreground" : "background/closed"} — showing native notification`);

    /* ── Show native Android notification in ALL states ── */
    try {
      await self.registration.showNotification(title, options);
      const renderLatencyMs = Date.now() - receivedAt;
      console.log(
        "[PUSH] Notification rendered —",
        `tag=${tag}`,
        `category=${category}`,
        `priority=${priority}`,
        `foreground=${isForeground}`,
        `intentionalUpdate=${isIntentionalUpdate}`,
        `renderLatency=${renderLatencyMs}ms`
      );
    } catch (showErr) {
      console.error("[PUSH] showNotification failed:", showErr);
      /* Graceful fallback: minimal notification to prevent Chrome's default
       * "Tap to copy the URL for this app" placeholder notification */
      try {
        await self.registration.showNotification(title, {
          body,
          icon:  ICON_192,
          badge: BADGE_72,
          tag:   tag || `socio-${Date.now()}`,
          data:  { url: route, notificationId },
        });
        console.log("[PUSH] Notification rendered (fallback minimal options)");
      } catch (fallbackErr) {
        console.error("[PUSH] Fallback showNotification also failed:", fallbackErr);
      }
    }

    /* ── Also broadcast foregroundNotification to any background/hidden windows ──
     * Allows them to silently refresh their unread count without a visible toast. */
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
