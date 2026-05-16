"use client";

import { useNetwork } from "@/context/NetworkContext";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NetworkBanner() {
  const { status, pendingSyncCount } = useNetwork();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (status === "online" && pendingSyncCount === 0) {
      const t = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(t);
    } else {
      setShow(true);
    }
  }, [status, pendingSyncCount]);

  if (!show) return null;

  let bgClass = "bg-[#10b981]"; // Emerald
  let text = "Back Online";
  let icon = (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );

  if (status === "offline") {
    bgClass = "bg-[#374151]"; // Slate 700 (subtle dark)
    text = "Offline • Limited features";
    icon = (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
      </svg>
    );
  } else if (status === "unstable") {
    bgClass = "bg-[#d97706]"; // Amber 600
    text = "Unstable connection";
    icon = (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  } else if (status === "reconnecting") {
    bgClass = "bg-[#3b82f6]"; // Blue 500
    text = "Reconnecting...";
    icon = (
      <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  } else if (status === "syncing" && pendingSyncCount > 0) {
    bgClass = "bg-[#8b5cf6]"; // Violet 500
    text = `Syncing ${pendingSyncCount} offline ${pendingSyncCount === 1 ? 'scan' : 'scans'}...`;
    icon = (
      <svg className="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`absolute left-0 right-0 z-40 px-4 py-1.5 text-[11px] font-bold text-white/95 flex items-center justify-center gap-1.5 shadow-md backdrop-blur-md ${bgClass} border-t border-white/10`}
      >
        <span className="opacity-90 flex items-center justify-center">{icon}</span>
        {text}
      </motion.div>
    </AnimatePresence>
  );
}
