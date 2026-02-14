"use client";

import { Bell, X, Check, CheckCheck, Megaphone, Calendar, Info } from "lucide-react";
import { useNotifications, type Notification } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/dateUtils";

function typeIcon(type: string) {
  switch (type) {
    case "event_update":
    case "event_reminder":
      return <Calendar size={16} className="text-[var(--color-primary)]" />;
    case "broadcast":
      return <Megaphone size={16} className="text-[var(--color-warning)]" />;
    default:
      return <Info size={16} className="text-[var(--color-text-muted)]" />;
  }
}

function NotifItem({ n, onTap }: { n: Notification; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className={`w-full text-left p-4 flex gap-3 border-b border-[var(--color-border)] transition-colors ${
        n.read ? "opacity-60" : "bg-blue-50/60"
      }`}
    >
      <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight truncate">
          {n.title}
        </p>
        <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
          {n.message}
        </p>
        <p className="text-[11px] text-[var(--color-text-light)] mt-1">
          {timeAgo(n.createdAt)}
        </p>
      </div>
      {!n.read && (
        <span className="mt-1 w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0" />
      )}
    </button>
  );
}

export default function NotificationBell() {
  const { notifications, unreadCount, panelOpen, openPanel, closePanel, markRead, markAllRead } =
    useNotifications();
  const router = useRouter();

  const handleTap = (n: Notification) => {
    if (!n.read) markRead(n.id);
    if (n.eventId) {
      closePanel();
      router.push(`/event/${n.eventId}`);
    }
  };

  return (
    <>
      {/* Bell button */}
      <button
        onClick={openPanel}
        className="relative p-2 -mr-1 rounded-full hover:bg-black/5 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={22} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="badge-count">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {/* Backdrop */}
      <div
        className={`notif-backdrop ${panelOpen ? "open" : ""}`}
        onClick={closePanel}
      />

      {/* Panel */}
      <div className={`notif-panel ${panelOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="sticky top-0 z-10 glass border-b border-[var(--color-border)] px-4 py-3 flex items-center gap-3">
          <h2 className="font-bold text-base flex-1">Notifications</h2>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[12px] font-semibold text-[var(--color-primary)] flex items-center gap-1"
            >
              <CheckCheck size={14} /> Read all
            </button>
          )}
          <button
            onClick={closePanel}
            className="p-1.5 rounded-full hover:bg-black/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <Bell size={40} className="text-[var(--color-text-light)] mb-3" />
            <p className="text-sm font-semibold text-[var(--color-text-muted)]">
              No notifications yet
            </p>
            <p className="text-xs text-[var(--color-text-light)] mt-1">
              You'll be notified about event updates and more
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => (
              <NotifItem key={n.id} n={n} onTap={() => handleTap(n)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
