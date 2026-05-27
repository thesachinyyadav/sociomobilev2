"use client";

import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

interface DiagData {
  platform: string;
  serviceWorkers: string;
  vapidSubscription: string;
  permission: string;
  lastRefresh: string;
}

export default function NotificationDiagnostics() {
  const [data, setData] = useState<DiagData>({
    platform: "…",
    serviceWorkers: "…",
    vapidSubscription: "…",
    permission: "…",
    lastRefresh: "never",
  });
  const [isOpen, setIsOpen] = useState(false);

  const collectData = useCallback(async () => {
    // ── Service Worker registrations ───────────────────────────
    let swStatus = "N/A";
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length === 0) {
          swStatus = "None registered";
        } else {
          swStatus = regs
            .map((r) => {
              const scope = r.scope.replace(location.origin, "");
              const state = r.active?.state ?? (r.installing ? "installing" : "pending");
              const script = r.active?.scriptURL?.replace(location.origin, "") ?? "?";
              return `[${state}] ${script} (scope: ${scope || "/"})`;
            })
            .join(" | ");
        }
      } catch {
        swStatus = "Error reading registrations";
      }
    }

    // ── VAPID subscription state ───────────────────────────
    let vapidState = "Not Cached";
    let permission = "default";

    try {
      if (typeof window !== "undefined") {
        permission = Notification.permission;
        const cachedSub = localStorage.getItem("socio_vapid_subscription");
        if (cachedSub) {
          const parsed = JSON.parse(cachedSub);
          vapidState = parsed.endpoint ? `Cached (${parsed.endpoint.slice(0, 30)}…)` : "Cached (No endpoint)";
        }
      }
    } catch (e) {
      vapidState = `Error: ${(e as Error).message}`;
    }

    setData({
      platform: Capacitor.getPlatform(),
      serviceWorkers: swStatus,
      vapidSubscription: vapidState,
      permission,
      lastRefresh: new Date().toLocaleTimeString(),
    });
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!isOpen) return;

    collectData();
    const interval = setInterval(collectData, 5000);
    return () => clearInterval(interval);
  }, [isOpen, collectData]);

  if (process.env.NODE_ENV !== "development") return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 bg-black/50 text-white text-[10px] px-2 py-1 rounded opacity-50 hover:opacity-100 z-50 cursor-pointer"
        style={{ bottom: "max(env(safe-area-inset-bottom), 5rem)" }}
      >
        Push Debug
      </button>
    );
  }

  const isHealthy = data.permission === "granted" && data.vapidSubscription.startsWith("Cached");

  return (
    <div
      className="fixed left-4 right-4 bg-gray-900 text-green-400 font-mono text-[10px] p-3 rounded-lg shadow-xl z-50 overflow-auto max-h-[60vh] border border-gray-700"
      style={{ bottom: "max(env(safe-area-inset-bottom), 5rem)" }}
    >
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
        <h3 className="font-bold text-white">
          VAPID Push Diagnostics{" "}
          <span className={isHealthy ? "text-green-400" : "text-yellow-400"}>
            {isHealthy ? "✅" : "⚠️"}
          </span>
        </h3>
        <div className="flex gap-2">
          <button
            onClick={collectData}
            className="text-blue-400 hover:text-blue-200 px-2 cursor-pointer"
          >
            Refresh
          </button>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white px-2 cursor-pointer">
            Close
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Platform:</span>{" "}
          <span className="text-white">{data.platform}</span>
        </div>
        <div>
          <span className="text-gray-400">Permission:</span>{" "}
          <span className={data.permission === "granted" ? "text-green-400" : "text-red-400"}>
            {data.permission}
          </span>
        </div>
        <div className="break-all">
          <span className="text-gray-400">Subscription:</span>{" "}
          <span className={data.vapidSubscription.startsWith("Cached") ? "text-green-400" : "text-yellow-400"}>
            {data.vapidSubscription}
          </span>
        </div>
        <div className="break-all">
          <span className="text-gray-400">Service Workers:</span>{" "}
          <span className="text-cyan-400">{data.serviceWorkers}</span>
        </div>
        <div className="text-gray-600 pt-1 border-t border-gray-800">
          Last refresh: {data.lastRefresh}
        </div>
      </div>
    </div>
  );
}
