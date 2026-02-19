"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

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
  isBroadcast: boolean;
}

interface NotifCtx {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  refresh: () => void;
}

const NotifContext = createContext<NotifCtx>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  panelOpen: false,
  openPanel: () => {},
  closePanel: () => {},
  markRead: () => {},
  markAllRead: () => {},
  dismiss: () => {},
  dismissAll: () => {},
  refresh: () => {},
});

export const useNotifications = () => useContext(NotifContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { userData, session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userData?.email) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/pwa/notifications?email=${encodeURIComponent(userData.email)}&page=1&limit=30`,
        {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        }
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        if (data.unreadCount !== undefined) {
          setUnreadCount(data.unreadCount);
        } else {
          setUnreadCount((data.notifications || []).filter((n: Notification) => !n.read).length);
        }
      }
    } catch {}
    setIsLoading(false);
  }, [userData?.email, session?.access_token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!notifications.length) return;

    const newestUnread = notifications.find((n) => !n.read);
    if (!newestUnread) return;

    const key = `notif-seen-${newestUnread.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    try {
      new Notification(newestUnread.title, {
        body: newestUnread.message,
        tag: newestUnread.id,
      });
    } catch {}
  }, [notifications]);

  const markRead = useCallback(
    async (id: string) => {
      if (!userData?.email) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await fetch(`/api/pwa/notifications/${id}/read`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ email: userData.email }),
        });
      } catch {}
    },
    [userData?.email, session?.access_token]
  );

  const markAllRead = useCallback(async () => {
    if (!userData?.email) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch(`/api/pwa/notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ email: userData.email }),
      });
    } catch {}
  }, [userData?.email, session?.access_token]);

  const dismiss = useCallback(
    async (id: string) => {
      if (!userData?.email) return;

      const dismissed = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (dismissed && !dismissed.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      try {
        await fetch(`/api/pwa/notifications/${encodeURIComponent(id)}?email=${encodeURIComponent(userData.email)}`, {
          method: "DELETE",
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });
      } catch {}
    },
    [notifications, userData?.email, session?.access_token]
  );

  const dismissAll = useCallback(async () => {
    if (!userData?.email) return;

    setNotifications([]);
    setUnreadCount(0);

    try {
      await fetch(`/api/pwa/notifications?email=${encodeURIComponent(userData.email)}`, {
        method: "DELETE",
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
    } catch {}
  }, [userData?.email, session?.access_token]);

  return (
    <NotifContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        panelOpen,
        openPanel: () => setPanelOpen(true),
        closePanel: () => setPanelOpen(false),
        markRead,
        markAllRead,
        dismiss,
        dismissAll,
        refresh: fetchNotifications,
      }}
    >
      {children}
    </NotifContext.Provider>
  );
}
