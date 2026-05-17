"use client";

/**
 * lib/onesignal.ts
 * ─────────────────────────────────────────────────────────────────
 * Safe OneSignal Web Push initializer for SOCIO PWA.
 *
 * State machine:
 *   idle → initializing → initialized
 *                       ↘ failed
 *
 * Guards:
 *  • SSR            — never runs on the server
 *  • Capacitor APK  — web push skipped; future native FCM handles it
 *  • Duplicate init — state machine prevents concurrent / repeated calls
 *  • StrictMode     — module-level state survives React's double-invoke
 *  • Unsupported    — graceful no-op when Notification API is absent
 *  • Missing appId  — explicit log instead of crash
 * ─────────────────────────────────────────────────────────────────
 */

import { Capacitor } from "@capacitor/core";

type InitState = "idle" | "initializing" | "initialized" | "failed";

let state: InitState = "idle";

/** Returns the current init state — useful for diagnostics/testing. */
export function getOneSignalState(): InitState {
  return state;
}

export async function initOneSignal(): Promise<void> {
  // ── Guard 1: SSR ───────────────────────────────────────────────
  if (typeof window === "undefined") return;

  // ── Guard 2: State machine — prevent concurrent / duplicate calls
  if (state === "initialized") {
    console.log("[OneSignal] Already initialized");
    return;
  }
  if (state === "initializing") {
    console.log("[OneSignal] Init already in progress — skipping duplicate call");
    return;
  }
  if (state === "failed") {
    // Allow a single retry on explicit user action; do NOT retry on every
    // route transition.  Callers that want a retry must call _resetOneSignalState().
    console.log("[OneSignal] Previous init failed — call _resetOneSignalState() to retry");
    return;
  }

  // ── Guard 3: Capacitor native APK ─────────────────────────────
  if (Capacitor.isNativePlatform()) {
    console.log("[OneSignal] Native platform detected — skipping web push init");
    return;
  }

  // ── Guard 4: Browser Notification API ─────────────────────────
  if (!("Notification" in window)) {
    console.log("[OneSignal] Notifications unsupported in this browser");
    return;
  }

  // ── Guard 5: App ID ───────────────────────────────────────────
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId || appId === "placeholder_onesignal_id_here") {
    console.warn("[OneSignal] Missing app ID — skipping init");
    return;
  }

  // ── Transition: idle → initializing ───────────────────────────
  state = "initializing";
  console.log("[OneSignal] Initializing...");

  try {
    const OneSignal = (await import("react-onesignal")).default;

    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notifyButton: { enable: false } as any,
    });

    // ── Transition: initializing → initialized ─────────────────
    state = "initialized";
    console.log("[OneSignal] Web push initialized successfully");

    // ── Delivery pipeline diagnostics (temp — remove after confirming push delivery) ──
    try {
      const permission = OneSignal.Notifications.permission;
      const optedIn   = OneSignal.User.PushSubscription.optedIn;
      const subId     = OneSignal.User.PushSubscription.id;

      console.log("[OneSignal] Permission:", permission);
      console.log("[OneSignal] Subscribed (optedIn):", optedIn);
      console.log("[OneSignal] Subscription ID:", subId || "⚠ Not yet assigned — may appear after permission grant");
    } catch (diagErr) {
      console.warn("[OneSignal] Subscription diagnostics failed:", diagErr);
    }

    // ── Foreground notification display ────────────────────────
    // Chrome suppresses push notifications while the page is in focus.
    // This listener intercepts and forces display so users see alerts
    // even when the app is open.
    try {
      OneSignal.Notifications.addEventListener(
        "foregroundWillDisplay",
        (event: any) => {
          console.log("[OneSignal] Foreground notification received:", event?.notification?.title);
          // Force display even while app is foregrounded
          event?.notification?.display?.();
        }
      );
    } catch (fgErr) {
      console.warn("[OneSignal] Foreground listener setup failed:", fgErr);
    }

    // ── Subscription change listener ───────────────────────────
    try {
      OneSignal.User.PushSubscription.addEventListener(
        "change",
        (event: any) => {
          const current = event?.current;
          console.log("[OneSignal] Subscription changed → optedIn:", current?.optedIn, "| id:", current?.id);
        }
      );
    } catch (subErr) {
      console.warn("[OneSignal] Subscription change listener failed:", subErr);
    }

    // ── Push receive listener (SW fires this) ──────────────────
    try {
      OneSignal.Notifications.addEventListener(
        "click",
        (event: any) => {
          console.log("[OneSignal] Notification clicked:", event?.notification?.title);
        }
      );
    } catch (clickErr) {
      console.warn("[OneSignal] Click listener setup failed:", clickErr);
    }
  } catch (err: unknown) {
    // ── Transition: initializing → failed ─────────────────────
    state = "failed";

    // Structured telemetry — no sensitive payloads exposed
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
      } else if (msg.includes("subscription")) {
        console.error("[OneSignal] Subscription failure:", msg);
      } else {
        console.error("[OneSignal] Init failed:", msg);
      }
    } else {
      console.error("[OneSignal] Init failed with unknown error");
    }
  }
}

/**
 * Reset the state machine back to idle.
 *
 * Intended for:
 *  • Unit tests
 *  • Explicit user-triggered retry after a "failed" state
 *
 * Do NOT call this on every route transition.
 */
export function _resetOneSignalState(): void {
  state = "idle";
}
