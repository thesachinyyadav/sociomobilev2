"use client";

import { useEffect } from "react";
import { AlertTriangleIcon, RefreshCcwIcon } from "@/components/icons";
import { useRouter } from "next/navigation";

export default function ScannerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[FatalScannerTrace] SCANNER ERROR BOUNDARY CAUGHT ERROR:", {
      message: error.message,
      name: error.name,
      digest: error.digest,
      stack: error.stack,
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      navigator: typeof navigator !== 'undefined' ? {
        onLine: navigator.onLine,
        userAgent: navigator.userAgent
      } : null,
      serviceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? !!navigator.serviceWorker.controller : false,
      localStorage: typeof localStorage !== 'undefined' ? { ...localStorage } : {},
      sessionStorage: typeof sessionStorage !== 'undefined' ? { ...sessionStorage } : {},
    });
  }, [error]);

  const handleHardReset = () => {
    // Attempt to forcefully clean up any DOM artifacts
    document.body.classList.remove("barcode-scanner-active");
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(v => {
      try {
        const stream = v.srcObject as MediaStream;
        stream?.getTracks().forEach(t => t.stop());
        v.srcObject = null;
      } catch (e) {
        console.error("[FatalScannerTrace] Failed to stop video stream during hard reset", e);
      }
    });

    // Reset the boundary
    reset();
  };

  return (
    <div className="pwa-page-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-md bg-white p-4 rounded-2xl shadow-sm border border-[var(--color-border)] text-center">
        <div className="mx-auto w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-3">
          <AlertTriangleIcon size={26} />
        </div>
        <h2 className="text-[16px] font-bold text-[var(--color-text)] mb-2">
          Scanner encountered an error
        </h2>
        <p className="text-[12px] text-[var(--color-text-muted)] mb-4 break-words">
          An unexpected issue occurred while initializing the camera or scanner. Please reload to try again.
        </p>
        
        <div className="space-y-2.5">
          <button
            onClick={handleHardReset}
            className="w-full btn btn-primary flex items-center justify-center gap-2"
          >
            <RefreshCcwIcon size={16} />
            Recover Scanner
          </button>
          <button
            onClick={() => router.replace("/volunteer")}
            className="w-full py-2.5 px-4 rounded-[12px] border border-[var(--color-border)] text-[var(--color-text)] font-semibold active:scale-95 transition-transform"
          >
            Go back to events
          </button>
        </div>
      </div>
    </div>
  );
}
