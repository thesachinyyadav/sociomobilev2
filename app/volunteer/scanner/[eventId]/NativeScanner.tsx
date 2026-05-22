"use client";

import { useEffect, useMemo } from "react";
import { ArrowLeftIcon, BellIcon, FlashlightIcon } from "@/components/icons";
import type { VolunteerEvent } from "@/context/AuthContext";
import type { HistoryRow } from "./WebScanner";

interface NativeScannerProps {
  event: VolunteerEvent;
  scanCount: number;
  history: HistoryRow[];
  isScanning: boolean;
  cameraError: string | null;
  viewportStatus: "idle" | "success" | "duplicate" | "error";
  syncQueueLength: number;
  startScanner: () => Promise<void>;
  stopScanner: () => Promise<void>;
  setIsViewingAll: (val: boolean) => void;
  torchAvailable: boolean;
  torchEnabled: boolean;
  toggleTorch: () => Promise<void>;
  router: any;
  setSelectedRow: (row: HistoryRow) => void;
}

export default function NativeScanner({
  event,
  scanCount,
  history,
  isScanning,
  cameraError,
  viewportStatus,
  syncQueueLength,
  startScanner,
  stopScanner,
  setIsViewingAll,
  torchAvailable,
  torchEnabled,
  toggleTorch,
  router,
  setSelectedRow,
}: NativeScannerProps) {
  
  // Clean up backgrounds for native scanning
  useEffect(() => {
    if (isScanning) {
      document.documentElement.classList.add("barcode-scanner-active");
      document.body.classList.add("barcode-scanner-active");
    } else {
      document.documentElement.classList.remove("barcode-scanner-active");
      document.body.classList.remove("barcode-scanner-active");
    }
    return () => {
      document.documentElement.classList.remove("barcode-scanner-active");
      document.body.classList.remove("barcode-scanner-active");
    };
  }, [isScanning]);

  const lastScan = useMemo(() => {
    if (history.length === 0) return null;
    return history[0];
  }, [history]);

  const handleBack = () => {
    void stopScanner();
    router.replace("/volunteer");
  };

  // Viewport borders and glows depending on state
  const cutoutStatusClasses = useMemo(() => {
    switch (viewportStatus) {
      case "success":
        return "border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.6)]";
      case "duplicate":
        return "border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.6)]";
      case "error":
        return "border-rose-500 shadow-[0_0_25px_rgba(239,68,68,0.6)]";
      default:
        return "border-white/20";
    }
  }, [viewportStatus]);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-between bg-transparent select-none pt-[var(--safe-top)] pb-[var(--safe-bottom)]`}>
      
      {/* ── Top Safe Area HUD Navigation ── */}
      <div className="w-full px-4 flex flex-col gap-2 z-50">
        <div className="flex items-center justify-between h-14">
          {/* Close/Back button */}
          <button
            onClick={handleBack}
            className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-transform border border-white/10"
            aria-label="Exit scanner"
          >
            <span className="text-xl">✕</span>
          </button>

          {/* Immersive Event Label */}
          <div className="flex flex-col items-center max-w-[60vw]">
            <span className="text-[14px] font-bold text-white tracking-wide truncate w-full text-center drop-shadow-md">
              Scan Ticket
            </span>
            <span className="text-[10px] font-medium text-slate-300 truncate w-full text-center drop-shadow-md">
              {event.title}
            </span>
          </div>

          {/* Flashlight toggle */}
          {torchAvailable ? (
            <button
              onClick={toggleTorch}
              className={`w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all border ${
                torchEnabled
                  ? "bg-[#FFBA09] text-[#011F7B] shadow-[0_0_15px_rgba(255,186,9,0.5)] border-[#FFBA09]/30"
                  : "bg-black/40 text-white border-white/10 backdrop-blur-md"
              }`}
              aria-label={torchEnabled ? "Disable flashlight" : "Enable flashlight"}
            >
              <FlashlightIcon size={20} className={torchEnabled ? "fill-current" : ""} />
            </button>
          ) : (
            <div className="w-11" /> // Spacer for alignment
          )}
        </div>
      </div>

      {/* ── Immersive Cutout Center Section ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        <div 
          className={`w-[260px] h-[260px] rounded-[36px] border-[2px] transition-all duration-300 relative pointer-events-auto ${cutoutStatusClasses}`}
          style={{ boxShadow: "0 0 0 9999px rgba(1, 13, 59, 0.72)" }} // Premium Deep Navy translucent mask
        >
          {/* Laser animated scan sweep line */}
          {isScanning && (
            <div className="absolute left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-[#FFBA09] to-transparent animate-scanner-laser shadow-[0_0_8px_#FFBA09]" />
          )}

          {/* Outer yellow corner brackets */}
          <div className="absolute -top-1.5 -left-1.5 w-7 h-7 border-t-[4px] border-l-[4px] border-[#FFBA09] rounded-tl-[16px] pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 w-7 h-7 border-t-[4px] border-r-[4px] border-[#FFBA09] rounded-tr-[16px] pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 w-7 h-7 border-b-[4px] border-l-[4px] border-[#FFBA09] rounded-bl-[16px] pointer-events-none" />
          <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 border-b-[4px] border-r-[4px] border-[#FFBA09] rounded-br-[16px] pointer-events-none" />
        </div>

        {cameraError ? (
          <p className="mt-8 text-rose-400 text-sm font-semibold tracking-wide text-center drop-shadow-md px-6">
            {cameraError}
          </p>
        ) : (
          <p className="mt-8 text-white/80 text-[12px] font-semibold tracking-wider uppercase text-center drop-shadow-md px-6">
            Align QR Code Inside Frame
          </p>
        )}
      </div>

      {/* ── Glassmorphic Bottom Sheet Panel ── */}
      <div className="w-full bg-[#0B122C]/90 border-t border-white/10 backdrop-blur-xl rounded-t-[32px] px-6 pt-5 pb-[calc(16px+var(--safe-bottom))] space-y-4 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] z-50">
        
        {/* Drag handle line indicator */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-2 mb-2" />

        {/* Checked-in stats row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-wide">
              Scanned Attendees
            </h3>
            {syncQueueLength > 0 && (
              <span className="text-[#FFBA09] text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFBA09]/10 border border-[#FFBA09]/20 animate-pulse">
                ● {syncQueueLength} Syncing
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <span className="bg-[#FFBA09]/10 text-[#FFBA09] border border-[#FFBA09]/25 px-2.5 py-0.5 rounded-full text-[11px] font-black">
              {scanCount} Checked In
            </span>
            <button
              onClick={() => setIsViewingAll(true)}
              className="text-[12px] font-bold text-slate-300 hover:text-white active:scale-95 transition-all"
            >
              View All
            </button>
          </div>
        </div>

        {/* Scan feedback card */}
        <div className="w-full">
          {lastScan ? (
            <div 
              onClick={() => setSelectedRow(lastScan)}
              className={`p-3 rounded-2xl flex items-center justify-between border cursor-pointer active:scale-[0.99] transition-transform ${
                lastScan.status === "success"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                  : lastScan.status === "duplicate"
                  ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
                  : "bg-rose-500/10 border-rose-500/25 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  lastScan.status === "success"
                    ? "bg-emerald-500/20 text-emerald-200"
                    : lastScan.status === "duplicate"
                    ? "bg-amber-500/20 text-amber-200"
                    : "bg-rose-500/20 text-rose-200"
                }`}>
                  {lastScan.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] font-bold text-white truncate">{lastScan.name}</span>
                  <span className={`text-[11px] font-semibold ${
                    lastScan.status === "success" ? "text-emerald-400" : lastScan.status === "duplicate" ? "text-amber-400" : "text-rose-400"
                  }`}>
                    {lastScan.status === "success"
                      ? "✓ Verified Checked-In"
                      : lastScan.status === "duplicate"
                      ? "⚠️ Already Checked-In"
                      : "✕ Invalid Ticket"}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-slate-400 text-xs shrink-0 ml-2">
                <span className="font-mono">{lastScan.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                <span className="text-sm">›</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFBA09] animate-ping" />
              <p className="text-slate-400 text-xs font-medium">
                Point camera at participant QR code
              </p>
            </div>
          )}
        </div>

        {/* Compact history overlay (last 2 rows) */}
        {history.length > 1 && (
          <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
            {history.slice(1, 3).map((row) => (
              <div
                key={row.id}
                onClick={() => setSelectedRow(row)}
                className="flex items-center justify-between py-1 px-1 cursor-pointer hover:bg-white/5 rounded-lg"
              >
                <span className="text-xs text-slate-300 truncate max-w-[60vw]">
                  {row.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold ${
                    row.status === "success"
                      ? "text-emerald-400"
                      : row.status === "duplicate"
                      ? "text-[#FFBA09]"
                      : "text-rose-400"
                  }`}>
                    {row.status === "success" ? "Verified" : row.status === "duplicate" ? "Recheck" : "Invalid"}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {row.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
