"use client";

import React, { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  Calendar, 
  Clock,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { trackNotificationEvent } from "@/lib/notificationAnalytics";

export interface RealtimeToastData {
  id: string;
  title: string;
  body: string;
  type?: "success" | "info" | "warning" | "error" | "event" | "broadcast" | "event_reminder" | string;
  badge?: string;
  ctaText?: string;
  ctaRoute?: string;
  icon?: string;
  createdAt: number;
}

interface RealtimeToastProps {
  toast: RealtimeToastData;
  onDismiss: (id: string) => void;
}

const TYPE_STYLES = {
  success: {
    glow: "shadow-[0_8px_32px_rgba(16,185,129,0.15)] border-emerald-500/25",
    bar: "bg-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle2 size={16} className="text-emerald-400" />
  },
  info: {
    glow: "shadow-[0_8px_32px_rgba(37,99,235,0.15)] border-blue-500/25",
    bar: "bg-blue-500",
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: <Info size={16} className="text-blue-400" />
  },
  warning: {
    glow: "shadow-[0_8px_32px_rgba(245,158,11,0.15)] border-amber-500/25",
    bar: "bg-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: <AlertTriangle size={16} className="text-amber-400" />
  },
  broadcast: {
    glow: "shadow-[0_8px_32px_rgba(245,158,11,0.15)] border-amber-500/25",
    bar: "bg-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: <AlertTriangle size={16} className="text-amber-400" />
  },
  error: {
    glow: "shadow-[0_8px_32px_rgba(239,68,68,0.15)] border-red-500/25",
    bar: "bg-red-500",
    badgeBg: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: <XCircle size={16} className="text-red-400" />
  },
  event: {
    glow: "shadow-[0_8px_32px_rgba(124,58,237,0.2)] border-purple-500/25",
    bar: "bg-gradient-to-b from-purple-500 to-pink-500",
    badgeBg: "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-300 border-purple-500/20",
    icon: <Sparkles size={16} className="text-purple-400" />
  },
  event_reminder: {
    glow: "shadow-[0_8px_32px_rgba(124,58,237,0.2)] border-purple-500/25",
    bar: "bg-gradient-to-b from-purple-500 to-pink-500",
    badgeBg: "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-300 border-purple-500/20",
    icon: <Sparkles size={16} className="text-purple-400" />
  }
};

export default function RealtimeToast({ toast, onDismiss }: RealtimeToastProps) {
  const style = TYPE_STYLES[(toast.type || "info") as keyof typeof TYPE_STYLES] || TYPE_STYLES.info;
  const controls = useAnimation();

  // Auto-dismiss after 6.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 6500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  // Entrance animation controller
  useEffect(() => {
    controls.start({
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 350, damping: 25 }
    });
  }, [controls]);

  const handleDragEnd = (event: any, info: any) => {
    // If swiped significantly to the right, dismiss it
    if (info.offset.x > 100) {
      onDismiss(toast.id);
    } else {
      // Bounce back to original position
      controls.start({ x: 0, opacity: 1 });
    }
  };

  return (
    <motion.div
      layout
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: 0, right: 250 }}
      dragElastic={{ left: 0.05, right: 0.6 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={{ opacity: 0, y: -40, scale: 0.92, filter: "blur(6px)" }}
      className="w-full max-w-[370px] pointer-events-auto"
      style={{ originY: 0 }}
      exit={{ 
        opacity: 0, 
        scale: 0.88, 
        filter: "blur(8px)", 
        y: -15,
        transition: { duration: 0.22, ease: "easeOut" }
      }}
      whileHover={{ y: 2, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
    >
      <div 
        className={`relative overflow-hidden rounded-[24px] border bg-[#0d1425]/84 backdrop-blur-[20px] p-4 text-white ${style.glow} transition-all duration-300`}
        style={{
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
        }}
      >
        {/* Glow Accent Strip */}
        <div className={`absolute top-0 bottom-0 left-0 w-[4px] ${style.bar}`} />

        <div className="flex gap-3 pl-1">
          {/* Custom Avatar / Icon */}
          <div className="shrink-0 flex items-center justify-center">
            {toast.icon ? (
              <img 
                src={toast.icon} 
                alt="Notification icon" 
                className="w-10 h-10 rounded-[16px] object-cover border border-white/10"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-[16px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                {style.icon}
              </div>
            )}
          </div>

          {/* Text block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-widest border ${style.badgeBg}`}>
                {toast.badge || "ALERT"}
              </span>
              <span className="flex items-center gap-1 text-[9px] text-white/45 font-medium">
                <Clock size={9} />
                Just Now
              </span>
            </div>

            <h4 className="text-[13.5px] font-black leading-snug tracking-tight text-white/95 truncate">
              {toast.title}
            </h4>
            <p className="text-[11.5px] text-white/70 leading-relaxed mt-0.5 tracking-wide line-clamp-2">
              {toast.body}
            </p>

            {/* CTA action button */}
            {toast.ctaText && toast.ctaRoute && (
              <div className="mt-3 flex">
                <Link
                  href={toast.ctaRoute}
                  onClick={() => {
                    trackNotificationEvent(toast.id, "cta_click", {
                      ctaText: toast.ctaText,
                      route: toast.ctaRoute
                    });
                    onDismiss(toast.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 border border-white/10 text-white font-extrabold text-[10px] tracking-wider uppercase transition-all"
                >
                  {toast.ctaText}
                  <ArrowRight size={10} className="mt-0.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
