/* ──────────────────────────────────────────────────────────
   SOCIO PWA — Service Worker (VAPID Web Push)
   ────────────────────────────────────────────────────────── */

self.addEventListener("install", () => {
  console.log("[PUSH] SW installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[PUSH] SW activated and claiming clients.");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("[PUSH] Push received");
  
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    console.warn("[PUSH] Failed to parse push data as JSON, falling back to text:", err);
    try {
      const text = event.data ? event.data.text() : "";
      data = { body: text };
    } catch (textErr) {
      console.error("[PUSH] Failed to parse push data as text:", textErr);
    }
  }

  // Extract variables with defaults
  const title = data.title || "SOCIO";
  const body = data.body || data.message || "New activity on SOCIO";
  const tag = data.tag || data.notificationId || undefined;
  const route = data.actionUrl || data.deepLink || data.route || "/notifications";

  // Build standard notification options
  const options = {
    body,
    icon: data.icon || "/applogo.png",
    badge: data.badge || "/applogo.png",
    image: data.image || undefined,
    tag: tag || undefined,
    vibrate: data.vibrate || [200, 100, 200],
    renotify: tag ? true : false,
    silent: false,
    requireInteraction: data.requireInteraction || false,
    timestamp: data.timestamp || Date.now(),
    actions: data.actions || undefined,
    data: { url: route, notificationId: tag || null },
  };

  console.log("[PUSH] Displaying notification:", title, options);

  const promise = self.registration.showNotification(title, options)
    .then(async () => {
      console.log("[PUSH] Notification displayed");
      
      // Broadcast foreground sync message to all active/visible windows
      try {
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of clients) {
          if (client.visibilityState === "visible") {
            client.postMessage({
              type: "socio:foregroundNotification",
              title,
              body,
              route,
              tag,
              icon: data.icon,
              badge: data.badge,
              category: data.category || data.type || "info"
            });
          }
        }
      } catch (clientErr) {
        console.warn("[PUSH] Broadcast to clients failed:", clientErr);
      }
    })
    .catch((err) => {
      console.error("[PUSH] Delivery failed inside showNotification:", err);
      // Fallback display to prevent silent failure
      return self.registration.showNotification(title || "SOCIO", {
        body: body || "New notification received",
        icon: "/applogo.png",
        data: { url: route }
      });
    });

  event.waitUntil(promise);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  let targetUrl = event.notification?.data?.url || "/notifications";
  const notificationId = event.notification?.data?.notificationId;

  // Handle action buttons if clicked
  if (event.action) {
    console.log(`[PUSH] Notification action clicked: ${event.action}`);
    if (event.notification.data?.url) {
      targetUrl = event.notification.data.url;
    }
  }

  console.log(`[PUSH] Notification clicked: id=${notificationId}, targetUrl=${targetUrl}`);

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      
      // Look for a matching window to focus and navigate
      for (const client of allClients) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) {
            console.log("[PUSH] Focusing existing client window and navigating...");
            await client.focus();
            if (typeof client.navigate === "function") {
              await client.navigate(targetUrl);
            } else {
              client.postMessage({ type: "socio:notificationClick", url: targetUrl });
            }
            console.log("[PUSH] Deep link opened on existing window");
            return;
          }
        } catch (err) {
          console.warn("[PUSH] Failed to reuse client window:", err);
        }
      }
      
      // Fallback: Open a brand new window
      console.log("[PUSH] No open client window found. Opening new window...");
      await self.clients.openWindow(targetUrl);
      console.log("[PUSH] Deep link opened on new window");
    })()
  );
});

self.addEventListener("notificationclose", (event) => {
  const notificationId = event.notification?.data?.notificationId;
  console.log(`[PUSH] Notification closed: id=${notificationId}`);
});
