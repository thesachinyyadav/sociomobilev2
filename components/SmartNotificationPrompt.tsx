"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { BellRingIcon, XIcon } from "@/components/icons";

export default function SmartNotificationPrompt() {
  const { pushStatus, updatePromptStatus } = useNotifications();
  const { userData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  const supported = useMemo(
    () => typeof window !== "undefined" && "Notification" in window,
    []
  );

  // Reflect browser permission back into the persisted status so the rest
  // of the app knows when it's already enabled.
  useEffect(() => {
    if (!supported) return;
    if (Notification.permission === "granted") {
      updatePromptStatus("accepted");
    } else if (Notification.permission === "denied") {
      updatePromptStatus("denied");
    }
  }, [supported, updatePromptStatus]);

  // If pushStatus flips (most importantly: user turned notifications off on
  // /profile), reset the local dismissed flag so the popup reappears
  // immediately without waiting for a refresh.
  useEffect(() => {
    setDismissed(false);
  }, [pushStatus]);

  if (!supported) return null;
  if (!userData) return null;
  if (dismissed) return null;
  // Gate on the app-level pushStatus, NOT Notification.permission — disabling
  // via OneSignal optOut() leaves the browser permission "granted" forever,
  // so a permission-based gate could never re-show the popup after a disable.
  if (pushStatus === "granted") return null;
  // Don't double up on the dedicated /profile Notifications card.
  if (pathname?.startsWith("/profile")) return null;

  const handleEnable = () => {
    setDismissed(true);
    router.push("/profile");
  };

  const handleMaybeLater = () => {
    setDismissed(true);
  };

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
            aria-label="Dismiss"
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Stay updated with event alerts and registrations?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Get notified instantly when important updates happen.
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
