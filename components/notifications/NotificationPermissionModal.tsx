"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onEnable: () => Promise<void>;
  onClose: () => void;
  theme?: "yellow" | "blue";
}

export default function NotificationPermissionModal({
  isOpen,
  onEnable,
  onClose,
  theme = "blue",
}: NotificationPermissionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Set mounted status on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll of both html, body, and scrollable main container when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlHeight = document.documentElement.style.height;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyHeight = document.body.style.height;

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";

    const mainEl = document.querySelector("main");
    let originalMainOverflow = "";
    if (mainEl) {
      originalMainOverflow = mainEl.style.overflow;
      mainEl.style.overflow = "hidden";
    }

    // Prevent backdrop swiping/touch gestures from scrolling the background on mobile
    const preventDefault = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[role="dialog"]')) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchmove", preventDefault, { passive: false });

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.height = originalHtmlHeight;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.height = originalBodyHeight;
      if (mainEl) {
        mainEl.style.overflow = originalMainOverflow;
      }
      document.removeEventListener("touchmove", preventDefault);
    };
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleEnableClick = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    // Trigger haptic vibration if supported
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(12);
      } catch (err) {
        console.warn("[Haptic] Vibration failed:", err);
      }
    }

    try {
      // First check if browser natively blocked notifications already
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "denied") {
          throw new Error("Notifications are blocked in your browser settings. Please enable them manually.");
        }
      }

      await onEnable();
      onClose(); // Automatically close on success
    } catch (err: any) {
      setErrorMsg(
        err?.message || "An unexpected error occurred while enabling notifications."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[6px] touch-none overscroll-none"
            aria-hidden="true"
          />

          {/* Scrollable Container for Modal Card */}
          <div
            onClick={onClose}
            className="absolute inset-0 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto pt-6 pb-6"
          >
            {/* Modal Container */}
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.12 }}
              className="relative w-[92%] max-w-[360px] bg-white rounded-[28px] p-6 text-center z-10 shadow-[0_24px_64px_rgba(0,0,0,0.12)] border border-gray-100 my-auto"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              {/* Header: Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                  aria-label="Close modal"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 1L1 9M1 1L9 9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {/* Content Section */}
              <div className="mt-4 space-y-3">
                {/* Headline */}
                <h2
                  id="modal-title"
                  className="text-[22px] sm:text-[24px] font-extrabold text-[#0B1020] leading-snug tracking-tight"
                >
                  Stay updated with{" "}
                  <span className="text-[#FFB800]">event alerts</span> & registrations
                </h2>

                {/* Subtext */}
                <p className="text-[14px] sm:text-[15px] text-gray-500 leading-relaxed max-w-[340px] mx-auto">
                  Get notified instantly about event updates, registrations, and important announcements.
                </p>
              </div>

              {/* Inline Error Message */}
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold"
                >
                  <div className="flex gap-2 text-left">
                    <svg
                      className="w-4 h-4 shrink-0 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>{errorMsg}</span>
                  </div>
                </motion.div>
              )}

              {/* Buttons Area */}
              <div className="mt-6 flex flex-col gap-3">
                {/* Primary Enable CTA */}
                <motion.button
                  onClick={handleEnableClick}
                  disabled={isLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-[52px] flex items-center justify-center font-bold text-[15px] sm:text-[16px] rounded-[16px] bg-[#FFB800] hover:bg-[#E6A400] text-[#0B1020] focus:outline-none focus:ring-2 focus:ring-[#FFB800] shadow-md shadow-amber-950/5 transition-all select-none"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5 text-[#0B1020]"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Requesting Permission...</span>
                    </div>
                  ) : (
                    "Enable Notifications"
                  )}
                </motion.button>

                {/* Secondary Maybe Later Button */}
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-full h-[52px] flex items-center justify-center font-bold text-[15px] sm:text-[16px] rounded-[16px] border border-[#FFB800] hover:bg-[#FFB800]/5 text-[#0B1020] bg-transparent focus:outline-none focus:ring-2 focus:ring-[#FFB800] transition-colors select-none"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
