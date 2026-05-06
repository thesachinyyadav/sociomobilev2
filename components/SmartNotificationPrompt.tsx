"use client";

import { useEffect, useMemo, useState } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { BellRingIcon, XIcon } from "@/components/icons";

export default function SmartNotificationPrompt() {
  const { promptStatus, updatePromptStatus, enablePushNotifications } = useNotifications();
  const [show, setShow] = useState(false);

  const supported = useMemo(
    () => typeof window !== "undefined" && "Notification" in window,
    []
  );

  useEffect(() => {
    if (!supported) return;
    
    // Check if browser permission is already something else
    if (Notification.permission !== "default") {
      if (promptStatus !== "accepted" && Notification.permission === "granted") {
        updatePromptStatus("accepted");
      } else if (promptStatus !== "denied" && Notification.permission === "denied") {
        updatePromptStatus("denied");
      }
      return;
    }

    // Manually triggered by another component (e.g. Notifications page)
    if (promptStatus === "shown") {
      setShow(true);
      return;
    }

    // Only show if not shown/accepted/denied before
    if (promptStatus === "not_shown") {
      // Delay to not show immediately on load
      const timer = setTimeout(() => {
        updatePromptStatus("shown");
      }, 5000); // 5 seconds delay for first-time visitors
      return () => clearTimeout(timer);
    }
  }, [supported, promptStatus, updatePromptStatus]);

  const handleEnable = async () => {
    setShow(false);
    await enablePushNotifications();
    // updatePromptStatus is handled inside enablePushNotifications via Notification.permission check or similar
    // but we'll be safe
    if (Notification.permission === "granted") {
      updatePromptStatus("accepted");
    } else if (Notification.permission === "denied") {
      updatePromptStatus("denied");
    }
  };

  const handleMaybeLater = () => {
    setShow(false);
    // We don't change status to denied, so it might show up again later (contextually)
    // Or we can set a temporary session-based flag
  };

  if (!supported || !show) return null;

  return (
    <div className="fixed inset-x-4 bottom-[calc(var(--bottom-nav)+var(--safe-bottom)+20px)] z-50 animate-slide-up">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 dark:border-gray-800 p-5 flex flex-col gap-4 max-w-md mx-auto">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <BellRingIcon size={24} />
          </div>
          <button 
            onClick={handleMaybeLater}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Stay updated</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Get notified about events, deadlines, and announcements
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleEnable}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-md shadow-blue-200 dark:shadow-none"
          >
            Enable Notifications
          </button>
          <button
            onClick={handleMaybeLater}
            className="w-full py-3 px-4 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold rounded-xl transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
