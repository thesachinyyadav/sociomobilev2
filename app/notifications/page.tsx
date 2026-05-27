"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNotifications, type Notification } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Trash2, 
  RefreshCw, 
  ChevronRight, 
  Sparkles,
  AlertOctagon,
  Info,
  CheckCircle,
  Calendar,
  Inbox
} from "lucide-react";
import { timeAgo } from "@/lib/dateUtils";
import { motion, AnimatePresence } from "framer-motion";
import { trackNotificationEvent } from "@/lib/notificationAnalytics";


const TYPE_THEMES = {
  success: {
    icon: <CheckCircle size={14} className="text-emerald-400" />,
    badge: "SYSTEM",
    border: "border-emerald-500/20",
    glow: "shadow-[0_8px_32px_rgba(16,185,129,0.06)]",
    pulse: "bg-emerald-400 shadow-[0_0_8px_#10b981]"
  },
  error: {
    icon: <AlertOctagon size={14} className="text-red-400" />,
    badge: "SYSTEM",
    border: "border-red-500/20",
    glow: "shadow-[0_8px_32px_rgba(239,68,68,0.06)]",
    pulse: "bg-red-400 shadow-[0_0_8px_#ef4444]"
  },
  warning: {
    icon: <AlertOctagon size={14} className="text-amber-400" />,
    badge: "ALERT",
    border: "border-amber-500/20",
    glow: "shadow-[0_8px_32px_rgba(245,158,11,0.06)]",
    pulse: "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
  },
  broadcast: {
    icon: <AlertOctagon size={14} className="text-amber-400" />,
    badge: "BROADCAST",
    border: "border-amber-500/20",
    glow: "shadow-[0_8px_32px_rgba(245,158,11,0.06)]",
    pulse: "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
  },
  event_reminder: {
    icon: <Sparkles size={14} className="text-purple-400" />,
    badge: "EVENT",
    border: "border-purple-500/20",
    glow: "shadow-[0_8px_32px_rgba(124,58,237,0.08)]",
    pulse: "bg-purple-400 shadow-[0_0_8px_#7c3aed]"
  },
  info: {
    icon: <Info size={14} className="text-blue-400" />,
    badge: "INFO",
    border: "border-blue-500/20",
    glow: "shadow-[0_8px_32px_rgba(37,99,235,0.06)]",
    pulse: "bg-blue-400 shadow-[0_0_8px_#2563eb]"
  }
};

function Card({
  n,
  onTap,
  onClear,
}: {
  n: Notification;
  onTap: () => void;
  onClear: () => void;
}) {
  const theme = TYPE_THEMES[n.type as keyof typeof TYPE_THEMES] || TYPE_THEMES.info;

  return (
      <motion.div
        layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, x: -40 }}
      transition={{ type: "spring", stiffness: 450, damping: 30 }}
        className="relative mb-2.5 group"
      >
        <div
          className={`relative overflow-hidden transition-all duration-300 active:scale-[0.99] cursor-pointer rounded-[16px] p-3 border bg-white/70 backdrop-blur-[14px] ${
            !n.read 
              ? `${theme.glow} ${theme.border} border-l-[4px]` 
              : "opacity-75 border-slate-200/50 shadow-sm"
          }`}
        style={{
          borderLeftColor: !n.read ? undefined : "transparent"
        }}
        onClick={onTap}
      >
          <div className="flex gap-2.5">
            {/* Circular Glassmorphic Icon Wrapper */}
            <div className="shrink-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-[12px] bg-slate-100 border border-slate-200/50 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-200">
                {theme.icon}
              </div>
            </div>

          {/* Core Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#011F7B]/80 bg-[#011F7B]/5 px-2 py-0.5 rounded-full border border-[#011F7B]/10">
                  {theme.badge}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">
                  {timeAgo(n.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {!n.read && (
                  <span className={`w-1.5 h-1.5 rounded-full ${theme.pulse}`} />
                )}
                <ChevronRight size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </div>

            <h3 className={`text-[12px] font-black leading-snug tracking-tight ${!n.read ? "text-slate-900" : "text-slate-700"}`}>
              {n.title}
            </h3>

            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 tracking-wide line-clamp-2">
              {n.message}
            </p>

            {/* Event Tag Context */}
            {n.eventTitle && (
              <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200/40">
                <Calendar size={9} className="text-slate-400" />
                <span className="text-[9px] font-bold text-slate-500 truncate max-w-[150px]">
                  {n.eventTitle}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
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
    triggerPrompt,
    hasMore,
    loadMore,
    refresh
  } = useNotifications();
  const router = useRouter();

  const [showClearModal, setShowClearModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (showClearModal) {
      document.body.style.overflow = "hidden";
      if (mainEl) {
        mainEl.style.overflowY = "hidden";
      }
    } else {
      document.body.style.overflow = "";
      if (mainEl) {
        mainEl.style.overflowY = "";
      }
    }
    return () => {
      document.body.style.overflow = "";
      if (mainEl) {
        mainEl.style.overflowY = "";
      }
    };
  }, [showClearModal]);

  useEffect(() => {
    if (pushStatus === "not_requested") {
      triggerPrompt();
    }
  }, [pushStatus, triggerPrompt]);

  // Group notifications into Today, This Week, Earlier
  const groups = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThisWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

    const sorted = [...notifications].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const todayItems = sorted.filter(n => new Date(n.createdAt) >= startOfToday);
    const thisWeekItems = sorted.filter(n => {
      const d = new Date(n.createdAt);
      return d >= startOfThisWeek && d < startOfToday;
    });
    const earlierItems = sorted.filter(n => new Date(n.createdAt) < startOfThisWeek);

    return [
      { title: "Today", items: todayItems },
      { title: "This Week", items: thisWeekItems },
      { title: "Earlier", items: earlierItems },
    ].filter(g => g.items.length > 0);
  }, [notifications]);

  const handleDismissAll = async () => {
    setShowClearModal(false);
    await dismissAll();
  };

  const handleTap = (n: Notification) => {
    if (!n.read) markRead(n.id);
    const route = n.deepLink || n.actionUrl || (n.eventId ? `/event/${n.eventId}` : null);
    
    // Track click interaction analytics
    trackNotificationEvent(n.id, "clicked", { route: route || "/notifications" });
    
    if (route) {
      router.push(route);
    }
  };

  const handleClearOne = (n: Notification) => {
    if (!n.read) markRead(n.id);
    dismiss(n.id);
  };

  return (
    <div 
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: "linear-gradient(180deg, #F4F7FF 0%, #EEF3FF 40%, #F8FAFC 100%)"
      }}
    >
      {/* Blueprint Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.25]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(1, 31, 123, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(1, 31, 123, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px"
        }}
      />

      {/* Hero Header */}
      <div
        className="relative z-20 w-full overflow-hidden flex flex-col justify-between"
        style={{
          background: "linear-gradient(135deg, #011F7B 0%, #1E3FAB 100%)",
          height: "185px",
          paddingTop: "calc(var(--safe-top) + 12px)",
          paddingBottom: "18px",
          paddingLeft: "20px",
          paddingRight: "20px",
          borderBottomLeftRadius: "28px",
          borderBottomRightRadius: "28px",
          boxShadow: "0 8px 32px rgba(1,31,123,0.18)",
        }}
      >
        {/* Blueprint grids inside header */}
        <div
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative z-10 flex flex-col h-full justify-between w-full">
          {/* Navigation top row */}
          <div className="flex items-center justify-between w-full relative">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center active:scale-95 transition-all text-white cursor-pointer"
            >
              <ArrowLeft size={15} />
            </button>
            <div className="text-[14px] font-black tracking-[0.2em] text-white/80 absolute left-1/2 -translate-x-1/2 uppercase">
              Socio
            </div>
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center active:scale-95 transition-all text-white cursor-pointer"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Title + actions row */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[20px] font-extrabold tracking-tight text-white leading-none">
                Notifications
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFBA09] shadow-[0_0_5px_#FFBA09]" />
                <span className="text-[10px] font-medium text-white/80">
                  {unreadCount} unread
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 pb-0.5">
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold text-white/70 active:text-white transition-colors"
              >
                Mark read
              </button>
              <span className="w-px h-3 bg-white/20" />
              <button
                onClick={() => setShowClearModal(true)}
                className="text-[11px] font-semibold text-white/70 active:text-white transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Feed */}
      <div className="relative z-10 px-4 pt-4 pb-40">
        {isLoading && notifications.length === 0 ? (
          <div className="space-y-2.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-[68px] w-full border border-slate-200/40 skeleton"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(12px)",
                  borderRadius: "16px",
                }}
              />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4 relative overflow-hidden">
            <div className="absolute w-[240px] h-[240px] rounded-full border border-dashed border-[#011F7B]/5 animate-[spin_120s_linear_infinite] pointer-events-none" />
            <div className="absolute w-[180px] h-[180px] rounded-full border border-dashed border-[#011F7B]/8 animate-[spin_60s_linear_infinite] pointer-events-none" style={{ animationDirection: "reverse" }} />
            <div className="w-12 h-12 rounded-full bg-white border border-slate-200/50 shadow-md flex items-center justify-center mb-3 relative z-10">
              <Inbox size={20} className="text-[#011F7B] opacity-75" />
            </div>
            <h2 className="text-[15px] font-black text-[#011F7B] tracking-tight relative z-10 uppercase">
              All caught up
            </h2>
            <p className="text-[11px] text-slate-500 mt-1.5 max-w-[220px] leading-relaxed relative z-10">
              No matching notifications in this category. We&apos;ll ping you when there&apos;s new activity!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.title} className="space-y-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">
                  {group.title}
                </h2>
                <AnimatePresence mode="popLayout">
                  {group.items.map((n) => (
                    <Card
                      key={n.id}
                      n={n}
                      onTap={() => handleTap(n)}
                      onClear={() => handleClearOne(n)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center pt-3 pb-3">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-full bg-[#011F7B]/5 hover:bg-[#011F7B]/10 backdrop-blur-md border border-[#011F7B]/15 text-[#011F7B] font-black text-[9px] uppercase tracking-[0.15em] transition-all cursor-pointer"
                >
                  {isLoading ? "Syncing Feed…" : "Load older"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" 
            onClick={() => setShowClearModal(false)}
          />
          <div 
            className="relative w-full max-w-sm bg-white/95 backdrop-blur-[24px] rounded-2xl p-4 shadow-[0_24px_60px_rgba(1,31,123,0.18)] border border-white/50 transform transition-all scale-100 opacity-100"
            style={{ animation: "modalEnter 400ms cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div className="w-10 h-10 rounded-[12px] bg-red-500/10 border border-red-500/10 flex items-center justify-center mb-3">
              <Trash2 size={18} className="text-[#EF4444]" />
            </div>
            <h3 className="text-[16px] font-black text-slate-900 tracking-tight mb-1.5">
              Clear all notifications?
            </h3>
            <p className="text-[12px] text-slate-500 leading-relaxed mb-4 font-medium">
              This action cannot be undone. All notifications will be permanently removed from your feed.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowClearModal(false)}
                className="flex-1 h-10 rounded-xl bg-slate-100 border border-slate-200/50 text-slate-600 font-black text-[10px] hover:bg-slate-200 transition-all uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleDismissAll}
                className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] shadow-[0_8px_20px_rgba(239,68,68,0.25)] transition-all uppercase tracking-wider cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.92) translateY(15px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
