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

  let bgClass = "bg-green-600";
  let text = "Back Online";
  let icon = "✅";

  if (status === "offline") {
    bgClass = "bg-red-600";
    text = "Offline Mode - Limited features";
    icon = "📡";
  } else if (status === "unstable") {
    bgClass = "bg-amber-500";
    text = "Unstable connection";
    icon = "⚠️";
  } else if (status === "reconnecting") {
    bgClass = "bg-blue-500";
    text = "Reconnecting...";
    icon = "🔄";
  } else if (status === "syncing" && pendingSyncCount > 0) {
    bgClass = "bg-purple-600";
    text = `Syncing ${pendingSyncCount} offline ${pendingSyncCount === 1 ? 'scan' : 'scans'}...`;
    icon = "☁️";
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-0 left-0 right-0 z-50 px-4 py-1.5 text-xs font-medium text-white flex items-center justify-center gap-2 shadow-md ${bgClass}`}
      >
        <span className="text-sm">{icon}</span>
        {text}
      </motion.div>
    </AnimatePresence>
  );
}
