"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/Button";
import { LogOutIcon, BellIcon as Bell } from "@/components/icons";
import NotificationPermissionModal from "@/components/notifications/NotificationPermissionModal";

export default function SettingsPage() {
  const { userData, signOut } = useAuth();
  const { pushStatus, enablePushNotifications, disablePushNotifications } = useNotifications();
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDisablingPush, setIsDisablingPush] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  const isPushEnabled = pushStatus === "granted";
  const isPushBlocked = Capacitor.isNativePlatform()
    ? pushStatus === "denied"
    : browserPermission === "denied" || pushStatus === "denied";

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setBrowserPermission(Notification.permission);
    let permStatus: PermissionStatus | null = null;
    let onChange: (() => void) | null = null;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          permStatus = status;
          onChange = () => setBrowserPermission(Notification.permission);
          status.addEventListener("change", onChange);
        })
        .catch(() => {});
    }
    const onFocus = () => setBrowserPermission(Notification.permission);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (permStatus && onChange) permStatus.removeEventListener("change", onChange);
    };
  }, []);

  const handleDisableNotifications = async () => {
    setIsDisablingPush(true);
    try {
      await disablePushNotifications();
    } catch (e: any) {
      console.error("[Settings] disable error", e);
    } finally {
      setIsDisablingPush(false);
    }
  };

  if (!userData) return null;

  return (
    <div className="pwa-page px-4 pb-[calc(var(--bottom-nav)+var(--safe-bottom)+96px)] pt-5 animate-fade-in space-y-4">
      {/* Notifications Settings */}
      <div className="card p-4">
        <h2 className="text-[15px] font-extrabold mb-3">Notifications</h2>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
            <Bell size={17} className="text-amber-600" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-[13px] font-bold">Push Notifications</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {isPushEnabled
                ? "Push notifications are on"
                : isPushBlocked
                ? Capacitor.isNativePlatform()
                  ? "Blocked in app settings — enable there to allow"
                  : "Blocked in browser settings — enable there to allow"
                : "Get instant alerts for events & registrations"}
            </p>
          </div>
          {isPushEnabled ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              On
            </span>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={isPushBlocked}
              onClick={() => setIsModalOpen(true)}
            >
              Enable
            </Button>
          )}
        </div>

        {isPushEnabled && (
          <button
            type="button"
            onClick={handleDisableNotifications}
            disabled={isDisablingPush}
            className="mt-3 w-full text-center text-[12px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 py-2"
          >
            {isDisablingPush ? "Turning off…" : "Turn off notifications"}
          </button>
        )}
      </div>

      {/* Account Actions */}
      <div className="card p-4">
        <h2 className="text-[15px] font-extrabold mb-3">Account</h2>
        <Button
          variant="danger"
          fullWidth
          onClick={async () => {
            await signOut();
            router.replace("/auth");
          }}
          leftIcon={<LogOutIcon size={16} />}
        >
          Sign out
        </Button>
      </div>

      {/* Premium Permission Modal */}
      <NotificationPermissionModal
        isOpen={isModalOpen}
        onEnable={enablePushNotifications}
        onClose={() => setIsModalOpen(false)}
        theme="yellow"
      />
    </div>
  );
}
