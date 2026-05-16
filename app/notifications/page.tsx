"use client";

import { useEffect, useMemo, useState } from "react";
import { useNotifications, type Notification } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import { BellIcon, CalendarIcon, InfoIcon, ArrowLeftIcon, XIcon, CheckIcon, TrashIcon, RefreshCwIcon, ChevronRightIcon, AlertCircleIcon } from "@/components/icons";
import { timeAgo } from "@/lib/dateUtils";
import { motion, AnimatePresence } from "framer-motion";

function typeStyle(type: string) {
  if (type === "success" || type === "event_reminder") {
    return { 
      icon: <CheckIcon size={20} color="#10B981" />, 
      bg: "bg-[#ECFDF5]", 
      label: "SYSTEM"
    };
  } else if (type === "error") {
    return { 
      icon: <XIcon size={20} color="#EF4444" />, 
      bg: "bg-[#FEF2F2]", 
      label: "SYSTEM"
    };
  } else if (type === "broadcast" || type === "warning") {
    return { 
      icon: <AlertCircleIcon size={20} color="#F59E0B" />, 
      bg: "bg-[#FFFBEB]", 
      label: "SYSTEM"
    };
  } else {
    // Info / default
    return { 
      icon: <InfoIcon size={20} color="#2563EB" />, 
      bg: "bg-[#EFF6FF]", 
      label: "SYSTEM"
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
  const { icon, bg, label } = typeStyle(n.type);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      drag="x"
      dragConstraints={{ left: -80, right: 0 }}
      dragElastic={0.1}
      onDragEnd={(e, info) => {
        if (info.offset.x < -40) {
          onClear();
        }
      }}
      className={`relative mb-4 group`}
    >
      <div
        className={`relative overflow-hidden transition-all active:scale-[0.98] ${
          !n.read 
            ? "shadow-[0_8px_30px_rgba(1,31,123,0.08)]" 
            : "opacity-90 shadow-[0_4px_16px_rgba(0,0,0,0.03)]"
        }`}
        style={{
          background: "rgba(255,255,255,1)",
          border: "1px solid rgba(226,232,240,0.8)",
          borderRadius: "20px",
          padding: "18px",
          ...( !n.read ? { borderLeft: "4px solid #011F7B" } : { borderLeft: "4px solid transparent" } )
        }}
        onClick={onTap}
      >
        <div className="w-full text-left cursor-pointer flex gap-4">
          {/* Left Icon */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
            {icon}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#011F7B" }}>
                  {label}
                </span>
                <span className="text-[11px] text-slate-300">•</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {timeAgo(n.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#011F7B]/40">
                {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-[#011F7B]" />}
                <ChevronRightIcon size={18} />
              </div>
            </div>
            
            <h3 className="text-[18px] font-bold text-[#0F172A] mb-1.5 leading-tight">
              {n.title}
            </h3>
            
            <p className="text-[14px] text-[#64748B] leading-relaxed font-medium mb-4">
              {n.message}
            </p>

            {(n.eventTitle || !n.read) && (
              <div className="flex items-center justify-between mt-1">
                {n.eventTitle ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0]">
                    <CalendarIcon size={14} className="text-[#64748B]" />
                    <span className="text-[12px] font-bold text-[#475569] truncate">
                      {n.eventTitle}
                    </span>
                  </div>
                ) : <div />}

                {!n.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EFF6FF] text-[#011F7B] hover:bg-blue-100 transition-colors ml-auto shadow-sm"
                  >
                    <CheckIcon size={14} />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Mark Read</span>
                  </button>
                )}
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
    setShowClearModal(false);
    await dismissAll();
  };

  const handleTap = (n: Notification) => {
    if (!n.read) markRead(n.id);
    if (n.eventId) router.push(`/event/${n.eventId}`);
    else if (n.actionUrl) router.push(n.actionUrl);
  };

  const handleClearOne = (n: Notification) => {
    if (!n.read) markRead(n.id);
    dismiss(n.id);
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-[#F8FAFC]">
      {/* Background operational layers - Grid removed as per request */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" />

      {/* Premium Hero Header with Curves */}
      <div className="relative z-20 w-full overflow-hidden" style={{
        background: "linear-gradient(135deg, #011F7B 0%, #0c2b8c 50%, #153c9b 100%)",
        paddingTop: "calc(var(--safe-top) + 16px)",
        paddingBottom: "40px",
        paddingLeft: "24px",
        paddingRight: "24px",
        boxShadow: "0 10px 40px rgba(1,31,123,0.15)"
      }}>
        {/* Background stars / dots */}
        <div className="absolute inset-0 opacity-[0.3] pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "30px 30px"
        }} />

        {/* Wavy arch bottom SVG shape */}
        <div className="absolute bottom-0 left-0 right-0 w-full pointer-events-none translate-y-[1px]">
          <svg viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" className="w-full h-[24px]">
            <path d="M0 120 V 60 Q 720 -20 1440 60 V 120 Z" fill="#F8FAFC" />
          </svg>
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Top Row - Exact TopBar Design from Image */}
          <div className="flex items-center justify-between mb-1">
            <button 
              onClick={() => router.back()} 
              className="w-11 h-11 rounded-full bg-white/10 border border-white/5 flex items-center justify-center active:scale-90 transition-transform backdrop-blur-sm text-white"
            >
              <ArrowLeftIcon size={20} strokeWidth={2.5} />
            </button>
            
            <div className="text-[20px] font-black tracking-[0.1em] text-white absolute left-1/2 -translate-x-1/2">
              SOCIO
            </div>

            <div className="w-11 h-11 flex items-center justify-center text-white relative">
              {/* Empty placeholder to maintain title centering */}
            </div>
          </div>

          {/* Title Area */}
          <div className="flex flex-col gap-1">
            <h1 className="text-[38px] font-black tracking-tight text-white leading-tight">
              Notifications
            </h1>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="w-3 h-3 rounded-full bg-[#FFBA09] shadow-[0_0_12px_rgba(255,186,9,0.6)]" />
              <span className="text-[15px] font-bold text-white/95 tracking-wide">
                {unreadCount} unread updates
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 opacity-60 mb-6">
              <RefreshCwIcon size={14} className="text-white" />
              <span className="text-[13px] font-semibold text-white tracking-wide uppercase">
                Last synced just now
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Row - Floating above the curve */}
      <div className="relative z-30 px-6 flex items-center justify-center gap-4 -mt-6">
        <button
          onClick={markAllRead}
          className="flex-1 h-[46px] rounded-[16px] bg-white shadow-[0_8px_20px_rgba(1,31,123,0.12)] border border-[#E2E8F0] flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <CheckIcon size={16} className="text-[#011F7B]" strokeWidth={2.5} />
          <span className="text-[12px] font-bold uppercase tracking-wider text-[#011F7B]">MARK ALL AS READ</span>
        </button>

        <button
          onClick={() => setShowClearModal(true)}
          className="flex-1 h-[46px] rounded-[16px] bg-white shadow-[0_8px_20px_rgba(1,31,123,0.12)] border border-[#E2E8F0] flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <TrashIcon size={16} className="text-[#EF4444]" strokeWidth={2.5} />
          <span className="text-[12px] font-bold uppercase tracking-wider text-[#EF4444]">CLEAR ALL</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 pt-8 pb-48">
        {isLoading && notifications.length === 0 ? (
          <div className="space-y-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[120px] w-full rounded-[20px] border border-[var(--color-border)] shadow-[0_4px_16px_rgba(0,0,0,0.03)] skeleton" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8 relative">
            <div className="w-28 h-28 rounded-full bg-white shadow-[0_25px_50px_rgba(1,31,123,0.1)] flex items-center justify-center mb-10 relative border border-white">
              <div className="absolute inset-0 bg-[#011F7B]/5 rounded-full animate-ping opacity-20" />
              <InfoIcon size={42} className="text-[#011F7B] opacity-90" />
            </div>
            <h2 className="text-[26px] font-black text-[#0F172A] tracking-tight">No new updates</h2>
            <p className="text-[15px] text-[#64748B] mt-3 max-w-[260px] leading-relaxed font-semibold">
              You're all caught up. We'll alert you when there's operational activity.
            </p>
            <button 
              onClick={() => refresh()}
              className="mt-10 flex items-center gap-2.5 px-8 py-4 rounded-full bg-white border border-[#E2E8F0] shadow-md text-[#011F7B] font-black text-[14px] active:scale-95 transition-all tracking-wider uppercase"
            >
              <RefreshCwIcon size={16} />
              REFRESH
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <div key={group.title} className="space-y-5">
                <h2 className="text-[13px] font-black uppercase tracking-[0.25em] text-[#7088B6] pl-3 mb-3">
                  {group.title}
                </h2>
                <AnimatePresence>
                  {group.items.map((n) => (
                    <Card
                      key={n.id}
                      n={n}
                      onTap={() => handleTap(n)}
                      onClear={() => handleClearOne(n)}
                      onMarkRead={() => markRead(n.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ))}

            {hasMore && (
              <div className="pt-8 flex justify-center pb-8">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-10 py-4 rounded-full bg-white shadow-sm border border-[#E2E8F0] text-[#0F172A] font-black text-[12px] uppercase tracking-[0.2em] active:scale-95 transition-transform"
                >
                  {isLoading ? "Loading..." : "Load Older"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-5">
          <div 
            className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-md transition-opacity" 
            onClick={() => setShowClearModal(false)}
          />
          <div 
            className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-[0_25px_70px_rgba(0,0,0,0.2)] transform transition-all scale-100 opacity-100"
            style={{ animation: "modalEnter 400ms cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div className="w-16 h-16 rounded-[20px] bg-red-50 flex items-center justify-center mb-6 border border-red-100">
              <TrashIcon size={30} className="text-[#EF4444]" />
            </div>
            <h3 className="text-[22px] font-black text-[#0F172A] tracking-tight mb-3">
              Clear all notifications?
            </h3>
            <p className="text-[15px] text-[#64748B] font-semibold leading-relaxed mb-10">
              This action cannot be undone. All your current notifications will be permanently removed.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-4 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] font-black text-[14px] active:scale-95 transition-transform uppercase tracking-wider"
              >
                Cancel
              </button>
              <button 
                onClick={handleDismissAll}
                className="flex-1 py-4 rounded-full bg-[#EF4444] text-white font-black text-[14px] shadow-[0_8px_20px_rgba(239,68,68,0.3)] active:scale-95 transition-transform uppercase tracking-wider"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}} />
    </div>
  );
}
