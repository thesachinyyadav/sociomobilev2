"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { apiRequest } from "@/lib/apiClient";
import { startPerfSpan } from "@/lib/capacitorPerfAudit";
import { trackNotificationEvent } from "@/lib/notificationAnalytics";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  eventId: string | null;
  eventTitle: string | null;
  read: boolean;
  createdAt: string;
  actionUrl: string | null;
  deepLink?: string | null;
  category?: string;
  priority?: string;
  metadata?: Record<string, unknown>;
  isBroadcast: boolean;
}

type PushStatus = "not_requested" | "granted" | "denied";
export type NotificationPromptStatus = "not_shown" | "shown" | "accepted" | "denied";

interface NotifCtx {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  pushStatus: PushStatus;
  promptStatus: NotificationPromptStatus;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  refresh: () => void;
  hasMore: boolean;
  loadMore: () => void;
  enablePushNotifications: () => Promise<void>;
  disablePushNotifications: () => Promise<void>;
  updatePromptStatus: (status: NotificationPromptStatus) => void;
  triggerPrompt: () => void;
}

const NotifContext = createContext<NotifCtx>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  pushStatus: "not_requested",
  promptStatus: "not_shown",
  markRead: () => {},
  markAllRead: () => {},
  dismiss: () => {},
  dismissAll: () => {},
  refresh: () => {},
  hasMore: false,
  loadMore: () => {},
  enablePushNotifications: async () => {},
  disablePushNotifications: async () => {},
  updatePromptStatus: () => {},
  triggerPrompt: () => {},
});

export const useNotifications = () => useContext(NotifContext);

/* ── Helpers for Local State Persistence ── */
const LS_READ_KEY = "socio_read_notifications";
const LS_DISMISSED_KEY = "socio_dismissed_notifications";
const LS_PUSH_STATUS_KEY = "socio_push_status";

function getLocalSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  const raw = localStorage.getItem(key);
  return new Set(raw ? JSON.parse(raw) : []);
}

function saveLocalSet(key: string, set: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
}

function urlBase64ToUint8Array(base64String: string) {
  if (typeof window === "undefined") return new Uint8Array();
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

import { App } from "@capacitor/app";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { userData, isAuthReady } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus>("not_requested");
  const [promptStatus, setPromptStatus] = useState<NotificationPromptStatus>("not_shown");
  const [isPushReady, setIsPushReady] = useState(false);
  const router = useRouter();

  const LS_PROMPT_STATUS_KEY = "socio_notification_prompt_status";

  // Track page in a ref to avoid making it a reactive dep of fetchNotifications
  const pageRef = useRef(1);
  const [hasMore, setHasMore] = useState(true);

  // Load initial status
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pStatus = localStorage.getItem(LS_PUSH_STATUS_KEY) as PushStatus;
    if (pStatus) setPushStatus(pStatus);

    const prStatus = localStorage.getItem(LS_PROMPT_STATUS_KEY) as NotificationPromptStatus;
    if (prStatus) setPromptStatus(prStatus);
  }, []);

  const updatePromptStatus = useCallback((status: NotificationPromptStatus) => {
    setPromptStatus(status);
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_PROMPT_STATUS_KEY, status);
    }
  }, []);

  const triggerPrompt = useCallback(() => {
    if (promptStatus === "accepted" || promptStatus === "denied") return;
    updatePromptStatus("shown");
  }, [promptStatus, updatePromptStatus]);

  // 1. Push subsystem initialization
  //    • Web/PWA  → register /sw.js for VAPID web push
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleNotificationClick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const route = detail.route || detail.actionUrl || (detail.eventId ? `/event/${detail.eventId}` : null);
      if (route) {
        console.log("[Notification Router] SPA routing deep-link to:", route);
        router.push(route);
      }
    };
    window.addEventListener("socio:notificationClick", handleNotificationClick);

    // SW posts messages back to the page when the user taps a notification
    // (see public/sw.js notificationclick handler). Translate into the same
    // socio:notificationClick event so the click-routing flow above still works.
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "socio:notificationClick") {
        const route = event.data.url || "/notifications";
        window.dispatchEvent(new CustomEvent("socio:notificationClick", { detail: { route } }));

      } else if (event.data?.type === "socio:foregroundNotification") {
        // SW sent this because app is in background — re-dispatch for any listeners
        // and silently refresh the notification count
        window.dispatchEvent(new CustomEvent("socio:foregroundNotification", { detail: event.data }));
        fetchRef.current();

      } else if (event.data?.type === "socio:foregroundSync") {
        // SW suppressed the native notification because the app is currently visible.
        // Silently refresh unread count — no toast, no overlay, no popup.
        // This matches Instagram/Discord foreground notification UX.
        console.log("[PUSH] Foreground sync triggered — silently refreshing notification count");
        fetchRef.current();
      }
    };

    // Web / PWA SW registration:
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PUSH] Service worker registered (scope:", reg.scope, ")");
          setIsPushReady(true);
        })
        .catch((err) => {
          console.error("[PUSH] Service worker registration failed:", err);
          setIsPushReady(true);
        });
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    } else {
      setIsPushReady(true);
    }

    return () => {
      window.removeEventListener("socio:notificationClick", handleNotificationClick);
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      }
    };
  }, [router]);
  const enablePushNotifications = useCallback(async () => {
    if (typeof window === "undefined") return;

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast.error("Push notifications aren't supported in this browser");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
      if (!vapidKey) {
        console.error("[PUSH] NEXT_PUBLIC_VAPID_KEY is not set");
        toast.error("Push notifications are not configured (missing VAPID key)");
        return;
      }

      let reg: ServiceWorkerRegistration;
      try {
        reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
      } catch (swErr: unknown) {
        const msg = swErr instanceof Error ? swErr.message : "Service worker registration failed";
        console.error("[PUSH] Service worker registration failed:", swErr);
        toast.error(msg);
        return;
      }

      const permission = await Notification.requestPermission();
      console.log("[PUSH] Permission after request:", permission);

      const granted = permission === "granted";
      if (!granted) {
        setPushStatus(permission === "denied" ? "denied" : "not_requested");
        localStorage.setItem(LS_PUSH_STATUS_KEY, permission === "denied" ? "denied" : "not_requested");
        updatePromptStatus(permission === "denied" ? "denied" : "not_shown");
        if (permission === "denied") {
          toast.error("Notifications are blocked in browser settings");
        }
        return;
      }

      console.log("[PUSH] Permission granted");

      // Reuse existing subscription if present, otherwise create one.
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        try {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
          console.log("[PUSH] Subscription created:", subscription.endpoint);
        } catch (subErr: unknown) {
          const msg = subErr instanceof Error ? subErr.message : "Failed to subscribe to push";
          console.error("[PUSH] pushManager.subscribe failed:", subErr);
          toast.error(msg);
          return;
        }
      } else {
        console.log("[PUSH] Reusing existing push subscription:", subscription.endpoint);
      }

      // Cache the subscription locally in localStorage (no database persistence)
      const subJSON = JSON.stringify(subscription.toJSON());
      localStorage.setItem("socio_vapid_subscription", subJSON);
      localStorage.setItem("socio_vapid_subscription_created_at", new Date().toISOString());

      // Register the subscription on the backend database
      try {
        await apiRequest("/notifications/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: subJSON,
        });
        console.log("[PUSH] Registered subscription on backend database successfully");
      } catch (backendErr) {
        console.warn("[PUSH] Backend subscription registration failed:", backendErr);
      }

      const newStatus = "granted";
      setPushStatus(newStatus);
      localStorage.setItem(LS_PUSH_STATUS_KEY, newStatus);
      updatePromptStatus("accepted");

      toast.success("Notifications enabled!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to enable notifications";
      console.error("[PUSH] Enable error", e);
      toast.error(msg);
    }
  }, [updatePromptStatus]);

  const disablePushNotifications = useCallback(async () => {
    if (typeof window === "undefined") return;

    try {
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration("/sw.js");
          const subscription = await reg?.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
            console.log("[PUSH] Local unsubscribe complete");
          }
        } catch (e) {
          console.warn("[PUSH] Local unsubscribe error:", e);
        }
      }

      // Clear server subscription
      try {
        const cachedSub = localStorage.getItem("socio_vapid_subscription");
        if (cachedSub) {
          await apiRequest("/notifications/push/unsubscribe", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: cachedSub,
          });
          console.log("[PUSH] Unregistered subscription from backend database");
        }
      } catch (backendErr) {
        console.warn("[PUSH] Backend unsubscription failed:", backendErr);
      }

      // Clear local cache keys
      localStorage.removeItem("socio_vapid_subscription");
      localStorage.removeItem("socio_vapid_subscription_created_at");

      setPushStatus("not_requested");
      localStorage.setItem(LS_PUSH_STATUS_KEY, "not_requested");
      updatePromptStatus("not_shown");
      toast.success("Notifications turned off");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to turn off notifications";
      console.error("[PUSH] Disable error", e);
      toast.error(msg);
    }
  }, [updatePromptStatus]);
  /* ── Fetch notifications ──────────────────────────────────────────────
   * IMPORTANT: `unreadCount` and `page` are intentionally NOT in the dep
   * array. Reading them via functional setState or pageRef prevents the
   * callback reference from changing on every render, which previously
   * caused an infinite fetch loop:
   *   fetch → setUnreadCount → new callback ref → effect re-runs → fetch …
   * ─────────────────────────────────────────────────────────────────── */
  const fetchNotifications = useCallback(async (isLoadMore = false) => {
    if (!userData?.email) return;
    const endSpan = startPerfSpan("notifications.fetch", { isLoadMore });
    setIsLoading(true);

    const targetPage = isLoadMore ? pageRef.current + 1 : 1;

    const platform = Capacitor.getPlatform();
    console.log(`[API] endpoint: /notifications, platform: ${platform}`);

    try {
      const data = await apiRequest(
        `/notifications?email=${encodeURIComponent(userData.email)}&page=${targetPage}&limit=15`,
        { cache: "no-store" }
      ) as { notifications: Notification[]; debug?: unknown };

      console.log(
        `[Notifications] GET /notifications returned count=${(data?.notifications || []).length} debug=`,
        data?.debug
      );

      // Server now filters dismissed and applies read state via notification_user_status
      const processed = data.notifications || [];

      // Track delivery analytics for newly fetched notifications
      processed.forEach(n => {
        trackNotificationEvent(n.id, "delivered", { title: n.title });
      });

      if (isLoadMore) {
        setNotifications(prev => [...prev, ...processed]);
        pageRef.current = targetPage;
      } else {
        setNotifications(processed);
        pageRef.current = 1;
        // Functional update: avoids reading stale unreadCount in deps
        setUnreadCount(processed.filter(n => !n.read).length);
      }

        setHasMore(processed.length === 15);
    } catch (err) {
      console.error("Fetch error", err);
    }
    setIsLoading(false);
    endSpan({ status: "completed" });
  // Stable deps: only email and token. page is tracked via pageRef.
  // unreadCount is updated via functional setState — never read here.
  }, [userData?.email]);

  /* ── Stable fetch ref: the polling interval always calls the latest
   * version of fetchNotifications without needing to recreate the interval
   * every time the callback reference changes. ── */
  const fetchRef = useRef(fetchNotifications);
  useEffect(() => {
    fetchRef.current = fetchNotifications;
  }, [fetchNotifications]);

  /* ── Polling & Hydration effect ───────────────────────────────────────
   * Re-runs when the user's email changes AND OneSignal is fully ready.
   * - Polls every 60s
   * - Hydrates immediately on App resume (background -> foreground)
   * ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isAuthReady || !userData?.email || !isPushReady) return;
    
    console.log("[Notifications] Starting hydration...");
    
    const initialTimer = setTimeout(() => {
      fetchRef.current();
    }, 1500);

    const timer = setInterval(() => fetchRef.current(), 60000);

    let appStateListener: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          console.log("[Notifications] App resumed, hydrating...");
          fetchRef.current(); // Uses the /sync endpoint if !isLoadMore
        }
      }).then(listener => {
        appStateListener = listener;
      });
    }

    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [userData?.email, isAuthReady, isPushReady]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchRef.current(true);
    }
  }, [isLoading, hasMore]);

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));

    // Local persistence
    const set = getLocalSet(LS_READ_KEY);
    set.add(id);
    saveLocalSet(LS_READ_KEY, set);

    // Track analytics event
    trackNotificationEvent(id, "opened");

    // Backend sync (best effort)
    if (userData?.email) {
      apiRequest(`/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userData.email }),
      }).catch(() => {});
    }
  }, [userData?.email]);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    const set = getLocalSet(LS_READ_KEY);
    notifications.forEach(n => set.add(n.id));
    saveLocalSet(LS_READ_KEY, set);

    if (userData?.email) {
      apiRequest(`/notifications/mark-read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userData.email }),
      }).catch(() => {});
    }
  }, [notifications, userData?.email]);

  const dismiss = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));

    const set = getLocalSet(LS_DISMISSED_KEY);
    set.add(id);
    saveLocalSet(LS_DISMISSED_KEY, set);

    // Track analytics event
    trackNotificationEvent(id, "dismissed");

    if (userData?.email) {
      apiRequest(`/notifications/${encodeURIComponent(id)}?email=${encodeURIComponent(userData.email)}`, {
        method: "DELETE",
      }).catch(() => {});
    }
  }, [userData?.email]);

  const dismissAll = useCallback(async () => {
    const ids = notifications.map(n => n.id);
    setNotifications([]);
    setUnreadCount(0);

    const set = getLocalSet(LS_DISMISSED_KEY);
    ids.forEach(id => set.add(id));
    saveLocalSet(LS_DISMISSED_KEY, set);

    if (userData?.email) {
      apiRequest(`/notifications?email=${encodeURIComponent(userData.email)}`, {
        method: "DELETE",
      }).catch(() => {});
    }
  }, [notifications, userData?.email]);

  const contextValue = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      pushStatus,
      promptStatus,
      markRead,
      markAllRead,
      dismiss,
      dismissAll,
      refresh: () => fetchRef.current(),
      hasMore,
      loadMore,
      enablePushNotifications,
      disablePushNotifications,
      updatePromptStatus,
      triggerPrompt,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      pushStatus,
      promptStatus,
      markRead,
      markAllRead,
      dismiss,
      dismissAll,
      hasMore,
      loadMore,
      enablePushNotifications,
      disablePushNotifications,
      updatePromptStatus,
      triggerPrompt,
    ]
  );

  return (
    <NotifContext.Provider value={contextValue}>
      {children}
    </NotifContext.Provider>
  );
}
