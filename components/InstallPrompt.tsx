"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // @ts-expect-error - navigator.standalone is iOS specific
    if (window.navigator.standalone) return;

    // Check if dismissed recently (24h cooldown)
    const dismissed = localStorage.getItem("install-prompt-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 86400000) return;

    // iOS detection
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOSDevice) {
      setIsIOS(true);
      // Show after 3 seconds on iOS
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }

    // Android / Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 2 seconds
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("install-prompt-dismissed", Date.now().toString());
  };

  if (!show) return null;

  // iOS guide modal
  if (isIOS && showIOSGuide) {
    return (
      <div className="modal-backdrop" onClick={() => setShowIOSGuide(false)}>
        <div className="modal-card p-5" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-extrabold mb-4">Install SOCIO</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 text-sm font-bold text-[var(--color-primary)]">1</div>
              <div>
                <p className="text-[13px] font-semibold">Tap the Share button</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                  Look for <Share size={14} className="text-[var(--color-info)]" /> in Safari toolbar
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 text-sm font-bold text-[var(--color-primary)]">2</div>
              <div>
                <p className="text-[13px] font-semibold">Select "Add to Home Screen"</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">Scroll down in share sheet if needed</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 text-sm font-bold text-[var(--color-primary)]">3</div>
              <div>
                <p className="text-[13px] font-semibold">Tap "Add"</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">SOCIO will appear on your home screen</p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowIOSGuide(false)} className="btn btn-primary w-full mt-5">
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[calc(var(--bottom-nav)+var(--safe-bottom)+12px)] left-4 right-4 z-40 animate-slide-up">
      <div className="install-banner">
        <Image src="/logo.svg" alt="SOCIO" width={40} height={40} className="shrink-0 rounded-[10px]" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold">Install app</p>
          <p className="text-[11px] opacity-75 mt-0.5">Add SOCIO to your home screen for faster access</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleInstall} className="btn btn-sm bg-white text-[var(--color-primary-dark)] font-bold text-[12px] px-3 py-1.5">
            <Download size={14} /> Install app
          </button>
          <button onClick={handleDismiss} className="btn btn-sm btn-ghost text-white border-white/40 text-[12px] px-2.5 py-1.5">
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
