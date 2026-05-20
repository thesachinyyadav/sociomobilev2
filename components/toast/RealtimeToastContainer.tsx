"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import RealtimeToast, { RealtimeToastData } from "./RealtimeToast";

export default function RealtimeToastContainer() {
  const [toasts, setToasts] = useState<RealtimeToastData[]>([]);

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      const newToast: RealtimeToastData = {
        id: `t_${Math.random().toString(36).substr(2, 9)}`,
        title: detail.title || "Notification",
        body: detail.body || "",
        type: detail.category || (detail.type !== "socio:foregroundNotification" ? detail.type : null) || "info",
        badge: detail.badge || "UPDATE",
        ctaText: detail.ctaText || "View Detail",
        ctaRoute: detail.route || detail.ctaRoute || "/notifications",
        icon: detail.icon,
        createdAt: Date.now(),
      };

      // Add toast to stack, limit to max 3 concurrent cards
      setToasts((prev) => [newToast, ...prev].slice(0, 3));
    };

    window.addEventListener("socio:foregroundNotification", handleNotification);
    return () => {
      window.removeEventListener("socio:foregroundNotification", handleNotification);
    };
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-[calc(var(--safe-top)+14px)] left-1/2 -translate-x-1/2 z-[9999] w-full max-w-[390px] px-4 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <RealtimeToast
            key={toast.id}
            toast={toast}
            onDismiss={handleDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
