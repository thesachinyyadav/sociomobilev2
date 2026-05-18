"use client";

/**
 * lib/onesignal.ts
 * ─────────────────────────────────────────────────────────────────
 * Safe OneSignal Web Push initializer for SOCIO PWA.
 * ─────────────────────────────────────────────────────────────────
 */

import { Capacitor } from "@capacitor/core";

let initialized = false;

export function getOneSignalState(): "idle" | "initialized" {
  return initialized ? "initialized" : "idle";
}

export function _resetOneSignalState(): void {
  initialized = false;
}

export async function initOneSignal(): Promise<void> {
  // ── Guard 1: SSR ───────────────────────────────────────────────
  if (typeof window === "undefined") return;

  // ── Guard 2: Prevent concurrent or duplicate initialization ───
  if (initialized) {
    console.log("[OneSignal] Already initialized");
    return;
  }

  // Set the guard immediately to prevent double-invocation under React StrictMode
  initialized = true;

  // ── Guard 3: Capacitor native platform check ───────────────────
  if (Capacitor.isNativePlatform()) {
    console.log("[OneSignal] Native platform detected — skipping web push init");
    return;
  }

  // ── Guard 4: Browser Notification API availability ────────────
  if (!("Notification" in window)) {
    console.log("[OneSignal] Notifications unsupported in this browser");
    return;
  }

  // ── Guard 5: App ID existence check ────────────────────────────
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId || appId === "placeholder_onesignal_id_here") {
    console.warn("[OneSignal] Missing app ID — skipping init");
    return;
  }

  // ── STEP 8: Clear all cached states and bad worker registrations ──
  try {
    console.log("[OneSignal] Starting aggressive cleanup of stale states...");
    
    // Unregister all existing service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      console.log("[OneSignal] Removing SW:", reg.scope);
      await reg.unregister();
    }

    // Delete known OneSignal IndexedDB databases
    indexedDB.deleteDatabase("ONE_SIGNAL_SDK_DB");
    indexedDB.deleteDatabase("OneSignalSDKDatabase");

    // Clear caches that contain "onesignal"
    const cacheKeys = await caches.keys();
    for (const key of cacheKeys) {
      if (key.toLowerCase().includes("onesignal")) {
        console.log("[OneSignal] Deleting cache:", key);
        await caches.delete(key);
      }
    }

    // Clear local storage keys containing "onesignal"
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.toLowerCase().includes("onesignal")) {
        localStorage.removeItem(key);
      }
    }

    console.log("[OneSignal] Aggressive cleanup complete.");
    
    // Pause briefly to let the browser commit unregister/delete transactions
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (cleanupErr) {
    console.warn("[OneSignal] Pre-init cleanup warning:", cleanupErr);
  }

  // ── STEP 9: Final Initialization ──
  try {
    const OneSignal = (await import("react-onesignal")).default;

    console.log("[OneSignal] Initializing...");

    await OneSignal.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      serviceWorkerPath: "/push/OneSignalSDKWorker.js",
      serviceWorkerUpdaterPath: "/push/OneSignalSDKUpdaterWorker.js",
      serviceWorkerParam: {
        scope: "/push/",
      },
      notifyButton: {
        enable: false,
      } as any,
    });

    console.log("[OneSignal] Init success");

    // ── Diagnostic namespace logs ──
    console.log("[DEBUG] OneSignal object:", OneSignal);
    console.log("[DEBUG] Notifications namespace:", OneSignal?.Notifications);
    console.log("[DEBUG] PushSubscription namespace:", OneSignal?.User?.PushSubscription);

    // ── Safe, Self-Healing Event Listeners ──
    setTimeout(() => {
      const attachListenerWithRetry = (
        eventName: string,
        handler: (...args: any[]) => void,
        retriesLeft = 8
      ) => {
        try {
          if (!OneSignal?.Notifications) {
            console.warn(
              `[OneSignal] Notifications namespace missing — aborting ${eventName} registration`
            );
            return;
          }
          OneSignal.Notifications.addEventListener(eventName as any, handler as any);
          console.log(`[OneSignal] ${eventName} listener attached successfully`);
        } catch (err: any) {
          if (
            retriesLeft > 0 &&
            err instanceof TypeError &&
            (err.message.includes("'on'") || err.message.includes("undefined"))
          ) {
            console.warn(
              `[OneSignal] Internal emitter not ready for ${eventName} — retrying in 500ms (${retriesLeft} retries left)...`
            );
            setTimeout(
              () => attachListenerWithRetry(eventName, handler, retriesLeft - 1),
              500
            );
          } else {
            console.warn(
              `[OneSignal] Benign: Emitter not active for ${eventName} (this is normal if permissions are blocked or SDK is idle)`
            );
          }
        }
      };

      const attachSubscriptionListenerWithRetry = (retriesLeft = 8) => {
        try {
          if (!OneSignal?.User?.PushSubscription) {
            console.warn(
              "[OneSignal] PushSubscription namespace missing — aborting subscription change registration"
            );
            return;
          }
          OneSignal.User.PushSubscription.addEventListener("change" as any, (event: any) => {
            console.log("[OneSignal] Push subscription changed:", event);
          });
          console.log("[OneSignal] Push subscription listener attached successfully");
        } catch (err: any) {
          if (
            retriesLeft > 0 &&
            err instanceof TypeError &&
            (err.message.includes("'on'") || err.message.includes("undefined"))
          ) {
            console.warn(
              `[OneSignal] Internal subscription emitter not ready — retrying in 500ms (${retriesLeft} retries left)...`
            );
            setTimeout(() => attachSubscriptionListenerWithRetry(retriesLeft - 1), 500);
          } else {
            console.warn(
              "[OneSignal] Benign: Subscription emitter not active (this is normal if permissions are blocked or SDK is idle)"
            );
          }
        }
      };

      // Register click and permissionChange events with automatic retries if needed
      attachListenerWithRetry("click", (event: any) => {
        console.log("[OneSignal] Notification clicked:", event);
      });

      attachListenerWithRetry("permissionChange", (permission: boolean) => {
        console.log("[OneSignal] Permission changed:", permission);
      });

      // Register push subscription change events
      attachSubscriptionListenerWithRetry();
    }, 200);
  } catch (err: unknown) {
    initialized = false; // Reset guard so retry can be attempted later
    
    if (err instanceof Error) {
      const msg = err.message ?? "";
      if (msg.includes("permission") || msg.toLowerCase().includes("denied")) {
        console.warn("[OneSignal] Permission denied:", msg);
      } else if (
        msg.includes("serviceWorker") ||
        msg.includes("service worker") ||
        msg.includes("registration")
      ) {
        console.error("[OneSignal] Service worker registration failure:", msg);
      } else {
        console.error("[OneSignal] Init failed:", msg);
      }
    } else {
      console.error("[OneSignal] Init failed with unknown error");
    }
  }
}
