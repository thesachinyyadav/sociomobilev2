"use client";

/**
 * lib/onesignal.ts
 * ─────────────────────────────────────────────────────────────────
 * Safe, production-grade OneSignal Web Push initializer for SOCIO PWA.
 * ─────────────────────────────────────────────────────────────────
 */

import { Capacitor } from "@capacitor/core";

let initialized = false;
let onesignalFullyInitialized = false;

export function getOneSignalState(): "idle" | "initialized" {
  return initialized ? "initialized" : "idle";
}

export function isOneSignalFullyInitialized(): boolean {
  return onesignalFullyInitialized;
}

export function _resetOneSignalState(): void {
  initialized = false;
  onesignalFullyInitialized = false;
}

/**
 * Manual targeted cleanup for debugging/diagnostics.
 * Wipes out service workers, caches, IndexedDB, and localStorage keys.
 * Only run manually in debug mode, never automatically on startup.
 */
export async function nukeServiceWorkers(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    console.log("[OneSignal Cleanup] Starting manual targeted cleanup...");
    
    // 1. Unregister active service workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.active && (reg.active.scriptURL.includes('onesignalsdkworker') || reg.scope.includes('push'))) {
          console.log("[OneSignal Cleanup] Unregistering bad/stale worker scope:", reg.scope);
          await reg.unregister();
        }
      }
    }

    // 2. Clear OneSignal caches
    const cacheKeys = await caches.keys();
    for (const key of cacheKeys) {
      if (key.toLowerCase().includes('onesignal')) {
        console.log("[OneSignal Cleanup] Deleting cache:", key);
        await caches.delete(key);
      }
    }

    // 3. Clear OneSignal IndexedDB databases
    if (window.indexedDB && (window.indexedDB as any).databases) {
      const dbs = await (window.indexedDB as any).databases();
      for (const db of dbs) {
        if (db.name && db.name.toLowerCase().includes('onesignal')) {
          console.log("[OneSignal Cleanup] Deleting IndexedDB:", db.name);
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    }

    // 4. Delete local storage keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.toLowerCase().includes('onesignal')) {
        localStorage.removeItem(key);
      }
    }

    console.log("[OneSignal Cleanup] Manual targeted cleanup complete.");
  } catch (err) {
    console.warn("[OneSignal Cleanup] Manual cleanup failed:", err);
  }
}

export function initOneSignal(): void {
  // ── Guard 1: SSR check ─────────────────────────────────────────
  if (typeof window === "undefined") return;

  // ── STEP 7: Guard duplicate initialization ────────────────────
  if (initialized) {
    console.log("[OneSignal] Already initialized");
    return;
  }
  initialized = true;

  // Actual initialization routine
  const runInit = async () => {
    // ── STEP 5: Browser capability checks ────────────────────────
    if (!("serviceWorker" in navigator)) {
      console.log("[OneSignal] Skipping init: Service Workers not supported");
      initialized = false;
      return;
    }
    if (!("Notification" in window)) {
      console.log("[OneSignal] Skipping init: Notifications not supported");
      initialized = false;
      return;
    }
    if (!window.isSecureContext) {
      console.log("[OneSignal] Skipping init: Page not in a secure context");
      initialized = false;
      return;
    }

    // Capacitor platform check
    if (Capacitor.isNativePlatform()) {
      console.log("[OneSignal] Native platform detected — skipping web push init");
      return;
    }

    // App ID Check
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId || appId === "placeholder_onesignal_id_here") {
      console.warn("[OneSignal] Missing app ID — skipping init");
      initialized = false;
      return;
    }

    // ── STEP 6: Add explicit permission diagnostics ──────────────
    console.log("[OneSignal] Running pre-init diagnostics:");
    console.log("  • Notification.permission:", Notification.permission);
    console.log("  • navigator.serviceWorker:", !!navigator.serviceWorker);
    console.log("  • navigator.userAgent:", navigator.userAgent);
    console.log("  • window.location.origin:", window.location.origin);

    console.log("[OneSignal] Initializing...");
    const t0 = performance.now();

    // ── STEP 1: Wrap init in try/catch with detailed logs ────────
    try {
      const OneSignal = (await import("react-onesignal")).default;

      // ── STEP 2: Add soft timeout protection ────────────────────
      const initPromise = OneSignal.init({
        appId: appId,
        serviceWorkerPath: "/push/OneSignalSDKWorker.js",
        serviceWorkerUpdaterPath: "/push/OneSignalSDKUpdaterWorker.js",
        serviceWorkerParam: {
          scope: "/push/",
        },
        notifyButton: {
          enable: false,
        } as any,
      });

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.warn("[OneSignal] Init taking longer than expected...");
          resolve("timeout");
        }, 10000);
      });

      // Race initialization against the timeout limit without throwing
      await Promise.race([initPromise, timeoutPromise]);

      function runPostNotificationBootstrapTasks() {
        console.log("[OneSignal] Running post-notification bootstrap tasks...");
        onesignalFullyInitialized = true;
        window.dispatchEvent(new CustomEvent("socio:onesignalFullyInitialized"));
      }

      // Continue waiting silently in background for full initialization
      initPromise
        .then(() => {
          const duration = (performance.now() - t0).toFixed(2);
          console.log(`[OneSignal] SDK fully initialized (took ${duration}ms)`);

          // click listener
          try {
            if (OneSignal.Notifications) {
              OneSignal.Notifications.addEventListener("click", (event: any) => {
                console.log("[OneSignal] Notification clicked:", event);
                const n = event.notification;
                const route = n.additionalData?.deepLink || n.additionalData?.route || n.additionalData?.actionUrl;
                window.dispatchEvent(
                  new CustomEvent("socio:notificationClick", {
                    detail: {
                      route,
                      eventId: n.additionalData?.eventId || n.additionalData?.event_id,
                      festId: n.additionalData?.festId
                    }
                  })
                );
              });
              console.log("[OneSignal] click listener attached successfully");
            }
          } catch (clickErr) {
            console.warn("[OneSignal] Failed to attach click listener:", clickErr);
          }

          // foregroundWillDisplay listener
          try {
            if (OneSignal.Notifications) {
              OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event: any) => {
                console.log("[OneSignal] Foreground notification arrived:", event);
                event.preventDefault();
                const n = event.notification;
                const payloadType = n.additionalData?.type || n.additionalData?.category || "event";
                const payloadBadge = n.additionalData?.badge || "UPDATE";
                const payloadCtaText = n.additionalData?.ctaText || "View";
                const payloadCtaRoute = n.additionalData?.deepLink || n.additionalData?.route || n.additionalData?.actionUrl || "/notifications";
                window.dispatchEvent(
                  new CustomEvent("socio:foregroundNotification", {
                    detail: {
                      title: n.title,
                      body: n.body,
                      type: payloadType,
                      badge: payloadBadge,
                      ctaText: payloadCtaText,
                      ctaRoute: payloadCtaRoute,
                      icon: n.icon
                    }
                  })
                );
              });
              console.log("[OneSignal] foregroundWillDisplay listener attached successfully");
            }
          } catch (fgErr) {
            console.warn("[OneSignal] Failed to attach foreground listener:", fgErr);
          }

          // permissionChange listener
          try {
            if (OneSignal.Notifications) {
              OneSignal.Notifications.addEventListener("permissionChange", (permission: boolean) => {
                console.log("[OneSignal] Permission changed:", permission);
              });
              console.log("[OneSignal] permissionChange listener attached successfully");
            }
          } catch (permErr) {
            console.warn("[OneSignal] Failed to attach permission listener:", permErr);
          }

          // subscription change listener — dispatch a window event so the
          // NotificationContext can re-bind the external_id whenever the
          // subscription is (re)created. Without this re-trigger, a login()
          // call that ran before the subscription existed leaves the user
          // permanently unbound, and the server gets recipients=0.
          try {
            if (OneSignal.User && OneSignal.User.PushSubscription) {
              OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
                const current = event?.current || {};
                console.log("[OneSignal] Push subscription changed:", {
                  id: current.id,
                  token: current.token ? "present" : "none",
                  optedIn: current.optedIn,
                });
                window.dispatchEvent(
                  new CustomEvent("socio:onesignalSubscriptionChanged", {
                    detail: { id: current.id, optedIn: current.optedIn },
                  })
                );
              });
              console.log("[OneSignal] Push subscription listener attached successfully");
            }
          } catch (subErr) {
            console.warn("[OneSignal] Failed to attach subscription listener:", subErr);
          }

          // ── STEP 10: Verify subscription state ──────────────────────
          try {
            if (OneSignal?.User?.PushSubscription) {
              console.log(
                "[OneSignal] optedIn:",
                OneSignal.User.PushSubscription.optedIn
              );
              console.log("[OneSignal] pushToken:", OneSignal.User.PushSubscription.token || "none");
              console.log("[OneSignal] id:", OneSignal.User.PushSubscription.id || "none");
            }
          } catch (stateErr) {
            console.warn("[OneSignal] Failed to verify subscription state:", stateErr);
          }

          console.log("[OneSignal] Init success");

          // Schedule post-init queue via requestIdleCallback / setTimeout
          if ("requestIdleCallback" in window) {
            (window as any).requestIdleCallback(() => runPostNotificationBootstrapTasks(), { timeout: 3000 });
          } else {
            setTimeout(runPostNotificationBootstrapTasks, 3000);
          }
        })
        .catch((err) => {
          handleInitError(err);
        });

    } catch (err: any) {
      handleInitError(err);
    }
  };

  function handleInitError(err: any) {
    initialized = false;
    const msg = (err && (err.message || String(err))) || "(unknown error)";
    const originLockMatch = /Can only be used on:\s*(\S+)/i.exec(msg);
    if (originLockMatch) {
      const allowedOrigin = originLockMatch[1];
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : "(ssr)";
      console.warn(
        `[OneSignal] Init skipped: this OneSignal app is locked to origin "${allowedOrigin}", but the page is running at "${currentOrigin}".\n` +
          `To enable local development:\n` +
          `  1. Open OneSignal Dashboard → Settings → Platforms → Web (Web Push).\n` +
          `  2. Under "Site Setup" / "Allowed Origins" add: ${currentOrigin}\n` +
          `  3. Save and hard-reload this page.\n` +
          `Alternative: open the deployed PWA at ${allowedOrigin} (the local server can still serve it via NEXT_PUBLIC_API_URL).`
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("socio:onesignalInitFailed", {
            detail: { reason: "origin-lock", allowedOrigin, currentOrigin },
          })
        );
      }
      return;
    }
    console.error("[OneSignal] Initialization error:", msg);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("socio:onesignalInitFailed", {
          detail: { reason: "unknown", message: msg },
        })
      );
    }
  }

  // ── STEP 4: Delay OneSignal initialization ────────────────────
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => {
      runInit();
    });
  } else {
    setTimeout(runInit, 2000);
  }
}
