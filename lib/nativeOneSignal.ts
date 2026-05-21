import { Capacitor } from "@capacitor/core";

/**
 * Initializes OneSignal push notifications for Capacitor native Android (or iOS) platforms.
 * This function is fully guarded and safe to import during SSR and on web browsers.
 */
export async function initNativeOneSignal(email?: string) {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return;
  }

  const runOneSignalInit = async () => {
    try {
      const OneSignal = (await import("onesignal-cordova-plugin")).default;
      const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

      if (!appId) {
        console.warn("[NATIVE PUSH] NEXT_PUBLIC_ONESIGNAL_APP_ID is not configured. Native push disabled.");
        return;
      }

      console.log("[NATIVE PUSH] OneSignal initializing...");
      OneSignal.initialize(appId);

      // Bind the user's email if they are logged in
      if (email) {
        const normalizedEmail = email.toLowerCase().trim();
        console.log(`[NATIVE PUSH] Logging in user with external ID: ${normalizedEmail}`);
        OneSignal.login(normalizedEmail);
        OneSignal.User.addTag("email", normalizedEmail);
      }

      // Handle notification clicks (tap from notification tray / background / killed state)
      OneSignal.Notifications.addEventListener("click", (event) => {
        console.log("[NATIVE PUSH] Notification clicked:", event);
        const notification = event.notification;
        const additionalData = (notification.additionalData as Record<string, any>) || {};

        // Parse action URL or fallback to notification center
        const route =
          additionalData.actionUrl ||
          additionalData.deepLink ||
          notification.launchURL ||
          (additionalData.eventId ? `/event/${additionalData.eventId}` : null) ||
          "/notifications";

        console.log("[NATIVE PUSH] Dispatching socio:notificationClick for route:", route);
        window.dispatchEvent(
          new CustomEvent("socio:notificationClick", {
            detail: { route },
          })
        );
      });

      // Handle notifications arriving while app is active in foreground
      OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event) => {
        console.log("[NATIVE PUSH] Notification received", event);
        const notification = event.getNotification();

        // Dispatch a custom event to notify listeners (e.g. to update counts or show custom banner/toast)
        window.dispatchEvent(
          new CustomEvent("socio:foregroundNotification", {
            detail: {
              title: notification.title,
              body: notification.body,
              additionalData: notification.additionalData,
            },
          })
        );

        // Also trigger foregroundSync event to refresh list/unread counts silently like web sw.js
        window.dispatchEvent(
          new CustomEvent("socio:foregroundSync", {
            detail: { type: "socio:foregroundSync" },
          })
        );
      });

      console.log("[NATIVE PUSH] OneSignal initialized");
    } catch (err) {
      console.error("[NATIVE PUSH] Failed to initialize OneSignal:", err);
    }
  };

  // Wait for cordova / device ready to ensure window.cordova is loaded
  if ((window as any).cordova) {
    await runOneSignalInit();
  } else {
    document.addEventListener("deviceready", runOneSignalInit, false);
  }
}

/**
 * Prompts the native OS dialog to request push notification permissions.
 * Safe to call; resolves to false on web/unsupported platforms.
 */
export async function requestNativePushPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const OneSignal = (await import("onesignal-cordova-plugin")).default;
    console.log("[NATIVE PUSH] Requesting push permission...");
    const granted = await OneSignal.Notifications.requestPermission(true);
    console.log("[NATIVE PUSH] Push permission granted state:", granted);
    return granted;
  } catch (err) {
    console.error("[NATIVE PUSH] requestNativePushPermission failed:", err);
    return false;
  }
}

/**
 * Returns whether the device currently has push permissions.
 */
export async function getNativePushPermissionState(): Promise<boolean> {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const OneSignal = (await import("onesignal-cordova-plugin")).default;
    return await OneSignal.Notifications.getPermissionAsync();
  } catch (err) {
    console.error("[NATIVE PUSH] getNativePushPermissionState failed:", err);
    return false;
  }
}

/**
 * Opts in the user device to receive push notifications via OneSignal.
 */
export async function optInNativePush() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return;
  }
  try {
    const OneSignal = (await import("onesignal-cordova-plugin")).default;
    OneSignal.User.pushSubscription.optIn();
    console.log("[NATIVE PUSH] Opted in device push subscription");
  } catch (err) {
    console.error("[NATIVE PUSH] optInNativePush failed:", err);
  }
}

/**
 * Opts out the user device from receiving push notifications via OneSignal.
 */
export async function optOutNativePush() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return;
  }
  try {
    const OneSignal = (await import("onesignal-cordova-plugin")).default;
    OneSignal.User.pushSubscription.optOut();
    console.log("[NATIVE PUSH] Opted out device push subscription");
  } catch (err) {
    console.error("[NATIVE PUSH] optOutNativePush failed:", err);
  }
}
