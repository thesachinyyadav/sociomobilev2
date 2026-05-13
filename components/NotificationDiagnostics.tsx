"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export default function NotificationDiagnostics() {
  const [data, setData] = useState<any>({});
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    async function collectData() {
      let swStatus = "N/A";
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        swStatus = reg ? `Registered (${reg.active ? "Active" : "Pending"})` : "Not Registered";
      }

      let osState = "Not loaded";
      let permission = "default";
      let pushToken = "N/A";
      const externalId = "N/A";

      try {
        if (Capacitor.isNativePlatform()) {
          const OS = (await import("onesignal-cordova-plugin")).default;
          if (OS) {
            osState = "Initialized (Native)";
            const deviceState = await OS.User.pushSubscription.getPushSubscriptionId();
            pushToken = deviceState || "None";
          }
        } else {
          const OS = (await import("react-onesignal")).default;
          if (OS.initialized) {
            osState = "Initialized (Web)";
            permission = Notification.permission;
            // The getPushSubscriptionId might be different in web
            pushToken = OS.User.PushSubscription.id || "None";
          }
        }
      } catch (e) {
        osState = `Error: ${(e as Error).message}`;
      }

      setData({
        platform: Capacitor.getPlatform(),
        serviceWorker: swStatus,
        oneSignal: osState,
        permission: permission,
        pushToken: pushToken,
      });
    }

    if (isOpen) {
      collectData();
      const interval = setInterval(collectData, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (process.env.NODE_ENV !== "development") return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 bg-black/50 text-white text-[10px] px-2 py-1 rounded opacity-50 hover:opacity-100 z-50"
      >
        OS Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-gray-900 text-green-400 font-mono text-[10px] p-3 rounded-lg shadow-xl z-50 overflow-auto max-h-[40vh] border border-gray-700">
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
        <h3 className="font-bold text-white">OneSignal Diagnostics</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white px-2">Close</button>
      </div>
      <div className="space-y-1">
        <div><span className="text-gray-400">Platform:</span> {data.platform}</div>
        <div><span className="text-gray-400">Service Worker:</span> {data.serviceWorker}</div>
        <div><span className="text-gray-400">OneSignal State:</span> {data.oneSignal}</div>
        <div><span className="text-gray-400">Permission:</span> {data.permission}</div>
        <div className="break-all"><span className="text-gray-400">Push Token:</span> {data.pushToken}</div>
      </div>
    </div>
  );
}
