"use client";

import { useEffect, useMemo } from "react";
import { useNotifications, type Notification } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import { BellIcon, CalendarIcon, MegaphoneIcon, InfoIcon, ArrowLeftIcon, XIcon, CheckIcon } from "@/components/icons";
import { Button } from "@/components/Button";
import { timeAgo } from "@/lib/dateUtils";

function typeStyle(type: string) {
  switch (type) {
    case "event_update":
    case "event_reminder":
      return { 
        icon: <CalendarIcon size={14} />, 
        color: "text-indigo-600 bg-indigo-50",
        label: "Event"
      };
    case "broadcast":
      return { 
        icon: <MegaphoneIcon size={14} />, 
        color: "text-orange-600 bg-orange-50",
        label: "Broadcast"
      };
    default:
      return { 
        icon: <InfoIcon size={14} />, 
        color: "text-teal-600 bg-teal-50",
        label: "System"
      };
  }
}

function Card({
  n,
  onTap,
  onClear,
  onMarkRead,
}: {
  n: Notification;
  onTap: () => void;
  onClear: () => void;
  onMarkRead: () => void;
}) {
  const { icon, color, label } = typeStyle(n.type);
  
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white bg-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-sm transition-all active:scale-[0.98] ${
        !n.read ? "ring-1 ring-[var(--color-primary)]/10" : "opacity-90"
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        className="absolute top-2 right-2 p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
        title="Dismiss"
      >
        <XIcon size={14} />
      </button>

      {!n.read && (
        <div className="absolute top-4 right-10 w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]" />
      )}

      <button onClick={onTap} className="w-full text-left p-3.5">
        <div className="flex gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${color}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-[9px] font-black uppercase tracking-widest ${color.split(' ')[0]}`}>
                {label}
              </span>
              <span className="text-[9px] text-[var(--color-text-light)]">•</span>
              <span className="text-[9px] text-[var(--color-text-light)] font-bold">
                {timeAgo(n.createdAt)}
              </span>
            </div>
            
            <p className="text-[13.5px] font-extrabold leading-tight text-[var(--color-text)]">
              {n.title}
            </p>
            
            <p className="text-[11.5px] text-[var(--color-text-muted)] mt-1.5 leading-relaxed line-clamp-2 font-medium">
              {n.message}
            </p>

            {n.eventTitle && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100">
                <CalendarIcon size={10} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 truncate">
                  {n.eventTitle}
                </span>
              </div>
            )}
          </div>
        </div>
      </button>

      {!n.read && (
        <div className="px-3 pb-3 pt-0 flex items-center justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[var(--color-primary)] hover:bg-blue-100 transition-colors shadow-sm"
            title="Mark as read"
          >
            <CheckIcon size={12} />
            <span className="text-[10px] font-black uppercase tracking-wider">Mark Read</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const { 
    notifications, 
    unreadCount, 
    markRead, 
    markAllRead, 
    dismiss, 
    dismissAll, 
    isLoading, 
    pushStatus, 
    triggerPrompt
  } = useNotifications();
  const router = useRouter();

  useEffect(() => {
    if (pushStatus === "not_requested") {
      triggerPrompt();
    }
  }, [pushStatus, triggerPrompt]);

  // Group notifications
  const groups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...notifications].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const todayItems = sorted.filter(n => new Date(n.createdAt) >= today);
    const earlierItems = sorted.filter(n => new Date(n.createdAt) < today);

    return [
      { title: "Today", items: todayItems },
      { title: "Earlier", items: earlierItems },
    ].filter(g => g.items.length > 0);
  }, [notifications]);

  const handleDismissAll = async () => {
    await dismissAll();
  };

  const handleTap = (n: Notification) => {
    if (!n.read) markRead(n.id);
    if (n.eventId) router.push(`/event/${n.eventId}`);
  };

  const handleClearOne = (n: Notification) => {
    if (!n.read) markRead(n.id);
    dismiss(n.id);
  };

  return (
    <div className="pwa-page min-h-screen bg-[#F8FAFC]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 pt-[calc(var(--safe-top)+12px)] pb-4 px-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeftIcon size={20} className="text-slate-600" />
          </button>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black tracking-tight text-slate-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-wider">
                {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-3 h-10 rounded-2xl bg-blue-50 text-[var(--color-primary)] flex items-center justify-center active:scale-95 transition-transform"
              >
                <span className="text-[12px] font-black uppercase tracking-wider">Mark all as read</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-6 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 w-full rounded-2xl bg-white border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-6 animate-bounce-in relative">
              <BellIcon size={32} className="text-[var(--color-primary)]" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-[#F8FAFC]" />
            </div>
            <h2 className="text-xl font-black text-slate-900">All caught up!</h2>
            <p className="text-[13px] text-slate-500 mt-2 max-w-[260px] leading-relaxed font-medium">
              No new updates right now. We&apos;ll notify you when something important happens.
            </p>
            <Button 
              variant="primary" 
              size="sm" 
              className="mt-8 px-8 rounded-2xl font-bold"
              onClick={() => router.back()}
            >
              Back to Home
            </Button>
          </div>
        ) : (
          <div className="space-y-8 stagger">
            {groups.map((group) => (
              <div key={group.title} className="space-y-4">
                <h2 className="text-[12px] font-black uppercase tracking-[0.15em] text-slate-400 pl-1">
                  {group.title}
                </h2>
                <div className="space-y-3">
                  {group.items.map((n) => (
                    <Card
                      key={n.id}
                      n={n}
                      onTap={() => handleTap(n)}
                      onClear={() => handleClearOne(n)}
                      onMarkRead={() => markRead(n.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
