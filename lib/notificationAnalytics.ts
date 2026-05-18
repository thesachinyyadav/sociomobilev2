/**
 * lib/notificationAnalytics.ts
 * ─────────────────────────────────────────────────────────────────
 * Lightweight interaction analytics helper for SOCIO notifications.
 * Tracks delivery, read, swipe-dismiss, clicks, and CTA interactions.
 * ─────────────────────────────────────────────────────────────────
 */

import { Capacitor } from "@capacitor/core";

export interface NotificationInteractionEvent {
  notificationId: string;
  action: "delivered" | "opened" | "clicked" | "dismissed" | "cta_click";
  metadata?: {
    title?: string;
    route?: string;
    ctaText?: string;
    timestamp: number;
    platform: "web" | "native";
  };
}

const LS_ANALYTICS_KEY = "socio_notification_analytics_v1";

function getLocalAnalyticsLogs(): NotificationInteractionEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_ANALYTICS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAnalyticsLogs(logs: NotificationInteractionEvent[]) {
  if (typeof window === "undefined") return;
  try {
    // Keep max 150 log entries to prevent local storage bloated consumption
    const trimmed = logs.slice(-150);
    localStorage.setItem(LS_ANALYTICS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn("[Analytics] LocalStorage write failed", err);
  }
}

export function trackNotificationEvent(
  notificationId: string,
  action: NotificationInteractionEvent["action"],
  metadata?: Omit<NotificationInteractionEvent["metadata"], "timestamp" | "platform">
) {
  if (typeof window === "undefined") return;

  const platform = Capacitor.getPlatform() !== "web" ? "native" : "web";

  const event: NotificationInteractionEvent = {
    notificationId,
    action,
    metadata: {
      ...metadata,
      timestamp: Date.now(),
      platform
    }
  };

  console.log(`[Analytics] Tracked: [${action.toUpperCase()}] for notif: ${notificationId}`, event);

  const currentLogs = getLocalAnalyticsLogs();
  currentLogs.push(event);
  saveLocalAnalyticsLogs(currentLogs);

  // Optional: If an API endpoint exists, sync best-effort in the background
  // apiRequest("/analytics/notifications", { method: "POST", body: JSON.stringify(event) }).catch(() => {});
}

export function getNotificationAnalyticsSummary() {
  const logs = getLocalAnalyticsLogs();
  const summary = {
    totalEvents: logs.length,
    delivered: logs.filter(l => l.action === "delivered").length,
    opened: logs.filter(l => l.action === "opened").length,
    clicked: logs.filter(l => l.action === "clicked").length,
    dismissed: logs.filter(l => l.action === "dismissed").length,
    ctaClicks: logs.filter(l => l.action === "cta_click").length,
  };
  return summary;
}
