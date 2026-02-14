"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  refresh: () => {},
});

export const useNotifications = () => useContext(NotifContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userData?.email) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/notifications?email=${encodeURIComponent(userData.email)}&limit=30`
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
    setIsLoading(false);
  }, [userData?.email]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = useCallback(
    async (id: string) => {
      if (!userData?.email) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await fetch(`${API_URL}/api/notifications/${id}/read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userData.email }),
        });
      } catch {}
    },
    [userData?.email]
  );

  const markAllRead = useCallback(async () => {
    if (!userData?.email) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch(`${API_URL}/api/notifications/mark-read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userData.email }),
      });
    } catch {}
  }, [userData?.email]);

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
        refresh: fetchNotifications,
      }}
    >
      {children}
    </NotifContext.Provider>
  );
}
