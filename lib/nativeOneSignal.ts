import { Capacitor } from "@capacitor/core";

let cordovaReadyPromise: Promise<void> | null = null;

/**
 * Returns a promise that resolves when Cordova is fully ready on a native device.
 * Includes a safety fallback timeout to avoid hanging indefinitely.
 */
export function ensureCordovaReady(): Promise<void> {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return Promise.resolve();
  }
  if (cordovaReadyPromise) {
    return cordovaReadyPromise;
  }
  cordovaReadyPromise = new Promise((resolve) => {
    if ((window as any).cordova) {
      resolve();
    } else {
      const onDeviceReady = () => {
        document.removeEventListener("deviceready", onDeviceReady);
        resolve();
      };
      document.addEventListener("deviceready", onDeviceReady, false);
      // Safety timeout: Cordova should initialize within 5 seconds
      setTimeout(() => {
        resolve();
      }, 5000);
    }
  });
  return cordovaReadyPromise;
}

/**
 * Initializes OneSignal push notifications for Capacitor native Android (or iOS) platforms.
 * This function is fully guarded and safe to import during SSR and on web browsers.
 */
export async function initNativeOneSignal(email?: string, name?: string) {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await ensureCordovaReady();
    const OneSignal = (await import("onesignal-cordova-plugin")).default;
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

    if (!appId) {
      console.warn("[NATIVE_PUSH] NEXT_PUBLIC_ONESIGNAL_APP_ID is not configured. Native push disabled.");
      return;
    }

    console.log("[NATIVE_PUSH] OneSignal initializing...");
    OneSignal.initialize(appId);

    console.log(
      "[ONESIGNAL_STATE]",
      OneSignal.User.pushSubscription.id,
      OneSignal.User.pushSubscription.token
    );

    // Bind the user's email and details if they are logged in
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`[NATIVE_PUSH] Logging in user with external ID: ${normalizedEmail}`);
      console.log("[ONESIGNAL_LOGIN]", normalizedEmail);
      OneSignal.login(normalizedEmail);
      OneSignal.User.addEmail(normalizedEmail);
      OneSignal.User.addTag("email", normalizedEmail);
      
      if (name) {
        const cleanName = name.trim();
        console.log(`[NATIVE_PUSH] Adding user name tag: ${cleanName}`);
        OneSignal.User.addTag("name", cleanName);
      }
      console.log("[ONESIGNAL] Linked user:", normalizedEmail);
    }

    // Add push subscription listener to log subscription/player IDs and FCM tokens dynamically
    OneSignal.User.pushSubscription.addEventListener("change", (event) => {
      console.log("[ONESIGNAL] Push subscription changed:", event);
      console.log("[ONESIGNAL_SUB_CHANGE]", event);
      const current = event.current;
      if (current) {
        console.log(`[ONESIGNAL] Subscription ID: ${current.id}`);
        console.log(`[FCM] Push Token: ${current.token}`);
        console.log(`[ONESIGNAL] Opted In: ${current.optedIn}`);
      }
    });

    // Handle notification clicks (tap from notification tray / background / killed state)
    OneSignal.Notifications.addEventListener("click", (event) => {
      console.log("[NATIVE_PUSH] Notification clicked:", event);
      const notification = event.notification;
      const additionalData = (notification.additionalData as Record<string, any>) || {};

      // Parse action URL or fallback to notification center
      const route =
        additionalData.actionUrl ||
        additionalData.deepLink ||
        notification.launchURL ||
        (additionalData.eventId ? `/event/${additionalData.eventId}` : null) ||
        "/notifications";

      console.log("[NATIVE_PUSH] Dispatching socio:notificationClick for route:", route);
      window.dispatchEvent(
        new CustomEvent("socio:notificationClick", {
          detail: { route },
        })
      );
    });

    // Handle notifications arriving while app is active in foreground
    OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event) => {
      console.log("[NATIVE_PUSH] Notification received in foreground", event);
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

    console.log("[NATIVE_PUSH] OneSignal initialized successfully");
  } catch (err) {
    console.error("[NATIVE_PUSH] Failed to initialize OneSignal:", err);
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
    await ensureCordovaReady();
    const OneSignal = (await import("onesignal-cordova-plugin")).default;
    console.log("[NATIVE_PUSH] Requesting push permission...");
    const granted = await OneSignal.Notifications.requestPermission(true);
    console.log("[NATIVE_PUSH] Push permission granted state:", granted);
    return granted;
  } catch (err) {
    console.error("[NATIVE_PUSH] requestNativePushPermission failed:", err);
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
    await ensureCordovaReady();
    const OneSignal = (await import("onesignal-cordova-plugin")).default;
    const permission = await OneSignal.Notifications.getPermissionAsync();
    console.log("[NATIVE_PUSH] Current permission state:", permission);
    return permission;
  } catch (err) {
    console.error("[NATIVE_PUSH] getNativePushPermissionState failed:", err);
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
    await ensureCordovaReady();
    const OneSignal = (await import("onesignal-cordova-plugin")).default;
    OneSignal.User.pushSubscription.optIn();
    console.log("[NATIVE_PUSH] Opted in device push subscription");
  } catch (err) {
    console.error("[NATIVE_PUSH] optInNativePush failed:", err);
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
    await ensureCordovaReady();
    const OneSignal = (await import("onesignal-cordova-plugin")).default;
    OneSignal.User.pushSubscription.optOut();
    console.log("[NATIVE_PUSH] Opted out device push subscription");
  } catch (err) {
    console.error("[NATIVE_PUSH] optOutNativePush failed:", err);
  }
}
