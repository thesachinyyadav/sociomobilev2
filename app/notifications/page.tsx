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
      icon: <CheckIcon size={18} color="#10B981" strokeWidth={2.5} />, 
      bg: "bg-[#ECFDF5] border border-[#D1FAE5]", 
      label: "SYSTEM"
    };
  } else if (type === "error") {
    return { 
      icon: <XIcon size={18} color="#EF4444" strokeWidth={2.5} />, 
      bg: "bg-[#FEF2F2] border border-[#FEE2E2]", 
      label: "SYSTEM"
    };
  } else if (type === "broadcast" || type === "warning") {
    return { 
      icon: <AlertCircleIcon size={18} color="#F59E0B" strokeWidth={2.5} />, 
      bg: "bg-[#FFFBEB] border border-[#FEF3C7]", 
      label: "SYSTEM"
    };
  } else {
    // Info / default
    return { 
      icon: <InfoIcon size={18} color="#2563EB" strokeWidth={2.5} />, 
      bg: "bg-[#EFF6FF] border border-[#DBEAFE]", 
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
      transition={{ duration: 0.18 }}
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
        className={`relative overflow-hidden transition-all active:scale-[0.98] duration-200 cursor-pointer ${
          !n.read 
            ? "shadow-[0_12px_30px_rgba(1,31,123,0.10),_0_0_15px_rgba(1,31,123,0.03)]" 
            : "opacity-90 shadow-[0_6px_20px_rgba(0,0,0,0.02)]"
        }`}
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(226, 232, 240, 0.85)",
          borderRight: "1px solid rgba(226, 232, 240, 0.85)",
          borderBottom: "1px solid rgba(226, 232, 240, 0.85)",
          borderLeft: !n.read ? "4px solid #011F7B" : "4px solid transparent",
          borderRadius: "28px",
          padding: "20px",
        }}
        onClick={onTap}
      >
        <div className="w-full text-left flex gap-4">
          {/* Left Icon */}
          <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${bg} shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]`}>
            {icon}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#011F7B]">
                  {label}
                </span>
                <span className="text-[11px] text-slate-300 font-bold">•</span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  {timeAgo(n.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-[#011F7B] shadow-[0_0_8px_#011F7B]" />}
                <ChevronRightIcon size={16} className="text-[#011F7B]/30" />
              </div>
            </div>
            
            <h3 className="text-[18px] font-extrabold text-[#0F172A] mb-1 leading-tight tracking-tight">
              {n.title}
            </h3>
            
            <p className="text-[13.5px] text-[#5C74A6] leading-relaxed font-medium mb-3">
              {n.message}
            </p>

            {(n.eventTitle || !n.read) && (
              <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                {n.eventTitle ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">
                    <CalendarIcon size={13} className="text-[#5C74A6]" />
                    <span className="text-[12px] font-bold text-[#334155] truncate max-w-[150px]">
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
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EEF3FF] border border-[#011F7B]/10 text-[#011F7B] hover:bg-[#011F7B]/5 active:scale-95 transition-all shadow-sm ml-auto"
                  >
                    <CheckIcon size={13} strokeWidth={2.5} />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Mark Read</span>
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
    <div 
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: "linear-gradient(180deg, #F4F7FF 0%, #EEF3FF 40%, #F8FAFC 100%)"
      }}
    >
      {/* Blueprint Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(1, 31, 123, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(1, 31, 123, 0.035) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px"
        }}
      />
      {/* Subtle radial glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full pointer-events-none blur-[120px] opacity-10"
        style={{
          background: "radial-gradient(circle, #011F7B 0%, transparent 70%)"
        }}
      />

      {/* Background Operational Dots */}
      <div className="absolute top-[320px] left-[10%] w-1.5 h-1.5 rounded-full bg-[#011F7B]/10 pointer-events-none" />
      <div className="absolute top-[580px] right-[8%] w-2 h-2 rounded-full bg-[#011F7B]/8 pointer-events-none" />
      <div className="absolute top-[800px] left-[15%] w-1.5 h-1.5 rounded-full bg-[#011F7B]/8 pointer-events-none" />

      {/* Premium Hero Header with Curved Corners */}
      <div 
        className="relative z-20 w-full overflow-hidden flex flex-col justify-between" 
        style={{
          background: "linear-gradient(135deg, #011F7B 0%, #1E3FAB 100%)",
          height: "260px",
          paddingTop: "calc(var(--safe-top) + 12px)",
          paddingBottom: "24px",
          paddingLeft: "24px",
          paddingRight: "24px",
          borderBottomLeftRadius: "36px",
          borderBottomRightRadius: "36px",
          boxShadow: "0 12px 32px rgba(1,31,123,0.18)"
        }}
      >
        {/* Blueprint grid overlay inside Hero */}
        <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px"
        }} />

        {/* Glowing operational dots */}
        <div className="absolute top-[80px] right-[25%] w-1.5 h-1.5 rounded-full bg-[#FFBA09] shadow-[0_0_8px_#FFBA09] opacity-60 animate-pulse pointer-events-none" />
        <div className="absolute top-[140px] left-[20%] w-1 h-1 rounded-full bg-blue-300 shadow-[0_0_6px_#93c5fd] opacity-40 pointer-events-none" />
        <div className="absolute top-[190px] right-[10%] w-1.5 h-1.5 rounded-full bg-[#FFBA09] shadow-[0_0_8px_#FFBA09] opacity-50 animate-pulse pointer-events-none" style={{ animationDelay: "1.5s" }} />
        
        {/* Soft radial glow inside Hero */}
        <div className="absolute bottom-[20%] right-[15%] w-48 h-48 rounded-full bg-blue-500/20 blur-[50px] pointer-events-none" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full justify-between w-full">
          {/* Top Row - Minimal layout with Back button and Centered Title, no bell */}
          <div className="flex items-center justify-between mb-2 w-full relative">
            <button 
              onClick={() => router.back()} 
              className="w-10 h-10 rounded-[14px] bg-black/35 border border-white/15 flex items-center justify-center active:scale-95 transition-all backdrop-blur-md text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-black/45 z-10"
            >
              <ArrowLeftIcon size={18} strokeWidth={2.5} />
            </button>
            
            <div className="text-[18px] font-black tracking-[0.1em] text-white absolute left-1/2 -translate-x-1/2 font-sans">
              SOCIO
            </div>

            <div className="w-10 h-10" />
          </div>

          {/* Title Area */}
          <div className="flex flex-col gap-1 mt-auto">
            <h1 className="text-[34px] font-extrabold tracking-tight text-white leading-none">
              Notifications
            </h1>
            <div className="flex flex-col gap-0.5 mt-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBA09] shadow-[0_0_8px_#FFBA09]" />
                <span className="text-[14px] font-semibold text-white tracking-wide">
                  {unreadCount} unread updates
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 opacity-80">
                <RefreshCwIcon size={12} className="text-white/70 shrink-0" />
                <span className="text-[11px] font-bold text-white/78 tracking-wider uppercase">
                  Last synced just now
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating pill buttons overlapping hero bottom edge */}
      <div className="relative z-30 px-6 flex items-center justify-center gap-4 -mt-6">
        <button
          onClick={markAllRead}
          className="flex-1 h-[48px] rounded-full bg-white/95 backdrop-blur-md shadow-[0_12px_24px_rgba(1,31,123,0.12)] border border-white/80 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-white/100"
        >
          <CheckIcon size={15} className="text-[#011F7B]" strokeWidth={2.5} />
          <span className="text-[11px] font-black uppercase tracking-wider text-[#011F7B]">MARK ALL AS READ</span>
        </button>

        <button
          onClick={() => setShowClearModal(true)}
          className="flex-1 h-[48px] rounded-full bg-white/95 backdrop-blur-md shadow-[0_12px_24px_rgba(1,31,123,0.12)] border border-white/80 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-white/100"
        >
          <TrashIcon size={15} className="text-[#F05252]" strokeWidth={2.5} />
          <span className="text-[11px] font-black uppercase tracking-wider text-[#F05252]">CLEAR ALL</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 pt-8 pb-48">
        {isLoading && notifications.length === 0 ? (
          <div className="space-y-5">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className="h-[120px] w-full border border-slate-200/60 skeleton" 
                style={{
                  background: "rgba(255, 255, 255, 0.6)",
                  backdropFilter: "blur(12px)",
                  borderRadius: "28px",
                }}
              />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8 relative overflow-hidden">
            {/* Layered concentric orbits/radar circles */}
            <div className="absolute w-[320px] h-[320px] rounded-full border border-dashed border-[#011F7B]/5 animate-[spin_120s_linear_infinite] pointer-events-none" />
            <div className="absolute w-[240px] h-[240px] rounded-full border border-dashed border-[#011F7B]/10 animate-[spin_60s_linear_infinite] pointer-events-none" style={{ animationDirection: "reverse" }} />
            
            {/* Glow effect behind the main circle */}
            <div className="absolute w-36 h-36 rounded-full bg-[#011F7B]/5 blur-2xl pointer-events-none" />

            {/* Inner Circle for the Icon */}
            <div className="w-24 h-24 rounded-full bg-white border border-[#E2E8F0] shadow-[0_16px_36px_rgba(1,31,123,0.12)] flex items-center justify-center mb-8 relative z-10">
              <InfoIcon size={34} className="text-[#011F7B] opacity-90" />
              {/* Subtle pulsing ring */}
              <div className="absolute inset-0 bg-[#011F7B]/5 rounded-full animate-ping opacity-30" />
            </div>

            {/* Typography */}
            <h2 className="text-[24px] font-extrabold text-[#011F7B] tracking-tight relative z-10">
              No new updates
            </h2>
            <p className="text-[14px] text-[#5C74A6] mt-3.5 max-w-[260px] leading-relaxed font-medium relative z-10">
              You're all caught up. We'll alert you when there's operational activity.
            </p>

            {/* Refresh button */}
            <button 
              onClick={() => refresh()}
              className="mt-10 flex items-center gap-2 px-7 py-3 rounded-full bg-white border border-[#011F7B]/30 shadow-[0_8px_20px_rgba(1,31,123,0.06)] text-[#011F7B] font-bold text-[13px] tracking-wider uppercase hover:scale-105 active:scale-95 transition-all relative z-10"
            >
              <RefreshCwIcon size={14} className="animate-spin-slow" />
              REFRESH
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <div key={group.title} className="space-y-5">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#5C74A6] pl-3 mb-4">
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
                  className="px-10 py-4 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-[#E2E8F0] text-[#0F172A] font-bold text-[12px] uppercase tracking-[0.2em] active:scale-95 transition-transform"
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
            className="relative w-full max-w-sm bg-white/95 backdrop-blur-md rounded-[28px] p-7 shadow-[0_24px_60px_rgba(1,31,123,0.18)] border border-white/50 transform transition-all scale-100 opacity-100"
            style={{ animation: "modalEnter 400ms cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div className="w-14 h-14 rounded-full bg-[#FEF2F2] border border-[#FEE2E2] flex items-center justify-center mb-5">
              <TrashIcon size={24} className="text-[#EF4444]" />
            </div>
            <h3 className="text-[20px] font-extrabold text-[#0F172A] tracking-tight mb-2">
              Clear all notifications?
            </h3>
            <p className="text-[14px] text-[#5C74A6] font-medium leading-relaxed mb-8">
              This action cannot be undone. All your current notifications will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-3.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] font-bold text-[13px] active:scale-95 transition-all uppercase tracking-wider"
              >
                Cancel
              </button>
              <button 
                onClick={handleDismissAll}
                className="flex-1 py-3.5 rounded-full bg-[#EF4444] text-white font-bold text-[13px] shadow-[0_8px_20px_rgba(239,68,68,0.25)] active:scale-95 transition-all uppercase tracking-wider"
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
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `}} />
    </div>
  );
}
