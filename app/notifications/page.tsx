"use client";

import { useNotifications, type Notification } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import { Bell, Calendar, Megaphone, Info, CheckCheck, ArrowLeft } from "lucide-react";
import { timeAgo } from "@/lib/dateUtils";

function typeStyle(type: string) {
  switch (type) {
    case "event_update":
    case "event_reminder":
      return { icon: <Calendar size={18} />, color: "bg-blue-50 text-[var(--color-primary)]" };
    case "broadcast":
      return { icon: <Megaphone size={18} />, color: "bg-amber-50 text-[var(--color-warning)]" };
    default:
      return { icon: <Info size={18} />, color: "bg-gray-100 text-[var(--color-text-muted)]" };
  }
}

function Card({ n, onTap }: { n: Notification; onTap: () => void }) {
  const { icon, color } = typeStyle(n.type);
  return (
    <button
      onClick={onTap}
      className={`w-full text-left card p-4 flex gap-3 animate-fade-up ${
        !n.read ? "border-l-[3px] border-l-[var(--color-primary)]" : ""
      }`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold leading-snug">{n.title}</p>
        <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 line-clamp-3">
          {n.message}
        </p>
        {n.eventTitle && (
          <span className="chip bg-blue-50 text-[var(--color-primary)] mt-1.5">
            {n.eventTitle}
          </span>
        )}
        <p className="text-[11px] text-[var(--color-text-light)] mt-1.5">{timeAgo(n.createdAt)}</p>
      </div>
    </button>
  );
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead, isLoading } = useNotifications();
  const router = useRouter();

  const handleTap = (n: Notification) => {
    if (!n.read) markRead(n.id);
    if (n.eventId) router.push(`/event/${n.eventId}`);
  };

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top)+8px)]">
      {/* Header */}
      <div className="px-4 flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1.5 rounded-full hover:bg-black/5">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-extrabold flex-1">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="btn btn-ghost btn-sm text-[12px]"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="px-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-20 w-full rounded-[var(--radius)]" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 animate-bounce-in">
            <Bell size={28} className="text-[var(--color-primary)]" />
          </div>
          <p className="text-base font-bold text-[var(--color-text)]">All caught up!</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-[240px]">
            You'll see event updates, reminders, and announcements here.
          </p>
        </div>
      ) : (
        <div className="px-4 space-y-2.5 stagger">
          {notifications.map((n) => (
            <Card key={n.id} n={n} onTap={() => handleTap(n)} />
          ))}
        </div>
      )}
    </div>
  );
}
