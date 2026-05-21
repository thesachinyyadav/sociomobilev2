"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import NotificationPermissionModal from "@/components/notifications/NotificationPermissionModal";

export default function SmartNotificationPrompt() {
  const { pushStatus, updatePromptStatus, enablePushNotifications } = useNotifications();
  const { userData } = useAuth();
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
  // Gate on the app-level pushStatus, NOT Notification.permission
  if (pushStatus === "granted") return null;
  // Don't double up on the dedicated /profile Notifications card.
  if (pathname?.startsWith("/profile")) return null;

  return (
    <NotificationPermissionModal
      isOpen={!dismissed}
      onEnable={enablePushNotifications}
      onClose={() => {
        setDismissed(true);
      }}
      theme="yellow"
    />
  );
}
