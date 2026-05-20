/* ──────────────────────────────────────────────────────────
   SOCIO PWA — Service Worker (VAPID Web Push)
   ────────────────────────────────────────────────────────── */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "SOCIO";
  const body = data.body || data.message || "";
  const tag = data.tag || data.notificationId || undefined;
  const route = data.actionUrl || data.deepLink || data.route || "/notifications";

  const options = {
    body,
    icon: data.icon || "/applogo.png",
    badge: data.badge || "/applogo.png",
    tag,
    vibrate: [200, 100, 200],
    renotify: !!tag,
    silent: false,
    data: { url: route, notificationId: data.tag || data.notificationId || null },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/notifications";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) {
            await client.focus();
            client.postMessage({ type: "socio:notificationClick", url: targetUrl });
            return;
          }
        } catch {
          // ignore non-URL clients
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
