/**
 * lib/notificationAnalytics.ts
 * ─────────────────────────────────────────────────────────────────
 * Lightweight interaction analytics helper for SOCIO notifications.
 * Tracks delivery, read, swipe-dismiss, clicks, and CTA interactions.
 * Uses batched queueing, debounced persistence, and idle-time flushing
 * to prevent main thread starvation during app bootstrap.
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

let analyticsBatchQueue: NotificationInteractionEvent[] = [];
let flushTimeoutId: any = null;

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
    const trimmed = logs.slice(-150);
    localStorage.setItem(LS_ANALYTICS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn("[Analytics] LocalStorage write failed", err);
  }
}

function flushAnalyticsBatch() {
  if (typeof window === "undefined" || analyticsBatchQueue.length === 0) return;

  const t0 = performance.now();
  const batch = [...analyticsBatchQueue];
  analyticsBatchQueue = [];
  flushTimeoutId = null;

  const currentLogs = getLocalAnalyticsLogs();
  currentLogs.push(...batch);
  saveLocalAnalyticsLogs(currentLogs);

  const duration = (performance.now() - t0).toFixed(2);
  console.log(`[Analytics] Batch sync complete (${batch.length} events persisted in ${duration}ms)`);
}

export function trackNotificationEvent(
  notificationId: string,
  action: NotificationInteractionEvent["action"],
  metadata?: Omit<NotificationInteractionEvent["metadata"], "timestamp" | "platform">
) {
  if (typeof window === "undefined") return;

  const t0 = performance.now();
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

  analyticsBatchQueue.push(event);

  const duration = (performance.now() - t0).toFixed(2);
  console.log(`[Analytics] Queued: [${action.toUpperCase()}] for notif: ${notificationId} (${duration}ms)`);

  // Schedule debounced idle flush
  if (!flushTimeoutId) {
    if ("requestIdleCallback" in window) {
      flushTimeoutId = setTimeout(() => {
        (window as any).requestIdleCallback(() => flushAnalyticsBatch(), { timeout: 2000 });
      }, 1000);
    } else {
      flushTimeoutId = setTimeout(flushAnalyticsBatch, 2000);
    }
  }
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
