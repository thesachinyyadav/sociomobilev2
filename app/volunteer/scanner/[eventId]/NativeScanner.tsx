"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  QrCodeIcon,
  BellIcon,
  FlashlightIcon,
} from "@/components/icons";
import { formatDateShort, formatTime } from "@/lib/dateUtils";
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
  userData: any;
  session: any;
  unreadCount: number;
  integrity: any;
  integrityLabel: (level: any) => string;
  imgError: boolean;
  setImgError: (val: boolean) => void;
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
  userData,
  session,
  unreadCount,
  integrity,
  integrityLabel,
  imgError,
  setImgError,
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

  const handleBack = () => {
    void stopScanner();
    router.replace("/volunteer");
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const borderClass =
    viewportStatus === "success" ? "border-emerald-500 border-2" :
    viewportStatus === "duplicate" ? "border-amber-500 border-2" :
    viewportStatus === "error" ? "border-rose-500 border-2" :
    "border-[#F1F5F9] border";

  return (
    <div className={`scan-page ${isScanning ? "scan-native-active" : ""}`} style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Standard TopBar (White) ── */}
      <header
        className="sticky top-0 left-0 right-0 bg-white border-b border-[#E2E8F0]"
        style={{ paddingTop: "var(--safe-top)", backfaceVisibility: "hidden", zIndex: 50 }}
      >
        <div
          className="relative flex items-center px-4"
          style={{ height: "var(--nav-height)" }}
        >
          {/* Left: Profile Avatar */}
          <div className="flex-1 flex justify-start">
            <Link href="/profile" className="shrink-0 block">
              <div className="w-[34px] h-[34px] rounded-full overflow-hidden ring-[2.5px] ring-[#000103] shadow-sm bg-[#011F7B] flex items-center justify-center">
                {userData?.avatar_url && !imgError ? (
                  <Image
                    src={userData.avatar_url}
                    alt={userData.name || "User"}
                    width={34}
                    height={34}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[13px] font-black text-white drop-shadow-sm">
                    {userData?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
            </Link>
          </div>
          
          {/* Center: SOCIO in Blue */}
          <span className="absolute left-1/2 -translate-x-1/2 text-[18px] font-black tracking-tight text-[#011F7B]">
            SOCIO
          </span>
          
          {/* Right: Notification Bell in Blue */}
          <div className="flex-1 flex justify-end">
            <Link href="/notifications" className="relative text-[#011F7B] p-1.5 -mr-1.5 active:scale-95 transition-transform">
              <BellIcon size={24} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[16px] h-4 bg-[#011F7B] text-white rounded-full text-[10px] flex items-center justify-center font-bold px-1 ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Time-integrity banner */}
      {integrity && integrity.level !== "trusted" && integrity.level !== "no-anchor" && (
        <div
          className={`scan-status-row scan-status-${
            integrity.level === "compromised" ? "error"
            : integrity.level === "expired-anchor" ? "error"
            : integrity.level === "stale-anchor" ? "warning"
            : "info"
          }`}
          role="status"
          aria-live="polite"
          style={{ position: "relative", zIndex: 35 }}
        >
          <span className="scan-status-dot" />
          <span className="scan-status-text">{integrityLabel(integrity.level)}</span>
        </div>
      )}

      {/* ── Navy Event Header ── */}
      <div 
        className={`bg-[#011F7B] px-4 pt-3 relative w-full flex-shrink-0 rounded-b-[40px] transition-all duration-300 ${
          isScanning ? "pb-12" : "pb-32"
        }`} 
        style={{ zIndex: 30 }}
      >
        <div className="flex flex-col gap-4 max-w-[480px] mx-auto">
          {/* Top row: Back button, Title, Pill */}
          <div className="flex items-center justify-between w-full gap-3">
            <button 
              className="flex-shrink-0 w-10 h-10 bg-[rgba(255,255,255,0.1)] rounded-xl flex items-center justify-center text-white active:bg-[rgba(255,255,255,0.2)] transition-colors"
              onClick={handleBack}
            >
              <ArrowLeftIcon size={20} />
            </button>
            <h1 className="text-white text-[17px] font-semibold leading-tight flex-1">{event.title}</h1>
            <div className="flex-shrink-0 border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] rounded-[14px] px-3 py-1.5 text-white text-[12px] font-semibold whitespace-nowrap">
              {scanCount} scanned
            </div>
          </div>
          
          {/* Bottom row: Metadata */}
          <div className="flex items-center gap-2 text-[11px] text-[#cbd5e1] font-medium flex-wrap px-1">
             {/* Date */}
             <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                {formatDateShort(event.event_date)}
             </span>
             <span className="w-[3px] h-[3px] rounded-full bg-[#94A3B8]" />
             {/* Time */}
             <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                {event.event_time ? formatTime(event.event_time) : "Time TBD"}
             </span>
             <span className="w-[3px] h-[3px] rounded-full bg-[#94A3B8]" />
             {/* Venue */}
             <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                {event.venue || event.campus_hosted_at || "Venue TBD"}
             </span>
          </div>
        </div>
      </div>

      <div 
        className={`scan-main-column px-4 relative pb-24 max-w-[480px] mx-auto w-full flex-shrink-0 flex flex-col gap-6 transition-all duration-300 ${
          isScanning ? "-mt-5 overflow-visible" : "-mt-24 overflow-y-auto"
        }`}
      >
        {/* ── Scanner Card Wrapper ── */}
        <div className="w-full relative rounded-[28px]">
          {/* Masking Shadow (Dummy Sibling) */}
          {isScanning && (
            <div 
              className="absolute inset-0 z-10 rounded-[28px] pointer-events-none"
              style={{
                boxShadow: '0 0 0 9999px #F8FAFF',
              }}
            />
          )}

          {/* Inner Card (provides padding and overflow clipping for the viewport's shadow) */}
          <div 
            className="w-full relative rounded-[28px] overflow-hidden p-5 flex flex-col items-center z-40"
            style={{
              backgroundColor: isScanning ? 'transparent' : '#ffffff',
              boxShadow: '0 12px 40px rgba(1,31,123,0.08)',
            }}
          >
            <section
              id="scan-viewport"
              className={`w-full relative rounded-[20px] overflow-hidden scan-viewport-${viewportStatus} ${borderClass}`}
              style={{ 
                aspectRatio: '1',
                backgroundColor: isScanning ? 'transparent' : '#ffffff',
                boxShadow: isScanning ? '0 0 0 9999px #ffffff' : 'none',
                zIndex: isScanning ? 15 : 'auto',
              }}
              aria-label="Camera scanner"
            >
              {/* Live Camera Viewport - transparent space overlay */}
              {isScanning && (
                <div 
                  className="absolute inset-0 bg-gradient-to-b from-[rgba(0,0,0,0.2)] to-[rgba(0,0,0,0.6)] pointer-events-none" 
                  aria-hidden="true" 
                />
              )}

              {/* Corner brackets + sweep line */}
              {isScanning && (
                <div className="scan-frame" aria-hidden="true">
                  <div className="scan-corner scan-corner-tl" />
                  <div className="scan-corner scan-corner-tr" />
                  <div className="scan-corner scan-corner-bl" />
                  <div className="scan-corner scan-corner-br" />
                  <div className="scan-line" />

                  {/* Stop scanning button */}
                  <button
                    className="absolute top-4 left-4 w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center z-50 pointer-events-auto active:scale-95 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      void stopScanner();
                    }}
                    aria-label="Stop scanning"
                  >
                    <span className="text-[18px]">✕</span>
                  </button>
                </div>
              )}

              {/* Idle state inside viewport */}
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-30">
                  {/* Dotted grid background */}
                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '16px 16px', opacity: 0.4 }} />
                  
                  {/* Yellow brackets */}
                  <div className="absolute inset-0 pointer-events-none z-10 p-6">
                     <div className="absolute top-6 left-6 w-10 h-10 border-t-[3px] border-l-[3px] border-[#FFBA09] rounded-tl-[16px]" />
                     <div className="absolute top-6 right-6 w-10 h-10 border-t-[3px] border-r-[3px] border-[#FFBA09] rounded-tr-[16px]" />
                     <div className="absolute bottom-6 left-6 w-10 h-10 border-b-[3px] border-l-[3px] border-[#FFBA09] rounded-bl-[16px]" />
                     <div className="absolute bottom-6 right-6 w-10 h-10 border-b-[3px] border-r-[3px] border-[#FFBA09] rounded-br-[16px]" />
                  </div>

                  {/* Center elements */}
                  <div className="z-20 flex flex-col items-center">
                    <div className="mb-6">
                      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" className="text-[#94A3B8] opacity-40">
                        <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2z" fill="currentColor"/>
                      </svg>
                    </div>
                    <p className="text-[#64748B] text-[12px] font-medium tracking-wide">Position QR code within the frame</p>
                  </div>
                </div>
              )}
            </section>

            {/* Error Message */}
            {cameraError && !isScanning && (
               <p className="text-[12px] font-semibold text-red-500 mt-4 text-center z-25 relative">{cameraError}</p>
            )}

            {/* Start Scanning Button */}
            {!isScanning && (
              <button
                id="start-scanning-btn"
                className="mt-5 w-full max-w-[320px] h-[52px] bg-[#011F7B] text-white rounded-[14px] font-semibold text-[15px] flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-[0_8px_20px_rgba(1,31,123,0.2)]"
                onClick={() => void startScanner()}
              >
                <QrCodeIcon size={20} className="text-[#FFBA09]" /> Start Scanning
              </button>
            )}
          </div>
        </div>

        <section 
          className="bg-white rounded-[24px] border border-[#F1F5F9] shadow-[0_4px_24px_rgba(15,23,42,0.03)] flex flex-col overflow-hidden" 
          aria-label="Recent scans"
          style={{ position: 'relative', zIndex: 30 }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F8FAFC]">
            <h3 className="text-[12px] font-bold text-[#0F172A] tracking-wider uppercase m-0 flex items-center gap-2">
              RECENT SCANS
              {syncQueueLength > 0 && (
                <span className="text-[#F59E0B] text-[9px]">● {syncQueueLength} pending</span>
              )}
            </h3>
            <button 
              onClick={() => setIsViewingAll(true)}
              className="text-[12px] font-bold text-[#011F7B] hover:opacity-70 transition-opacity"
            >
              View all
            </button>
          </div>

          <div className="flex flex-col">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-[#94A3B8]">
                <span className="text-[13px] font-medium">No scans yet</span>
              </div>
            ) : (
              history.slice(0, 5).map(row => {
                const statusLabel =
                  row.status === "success" ? "Verified" :
                  row.status === "duplicate" ? "Recheck" :
                  row.status === "offline" ? "Pending" :
                  row.status === "unauthorized" ? "Not assigned" :
                  "Error";

                const statusIcon =
                  row.status === "success" ? "✓" :
                  row.status === "duplicate" ? "!" :
                  row.status === "offline" ? "↑" :
                  "✕";
                
                return (
                  <div key={row.id} className="flex items-center justify-between py-3 px-4 border-b border-[#F8FAFC] last:border-0" onClick={() => setSelectedRow(row)}>
                    <div className="flex items-center gap-4 overflow-hidden min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0 ${row.status === 'success' ? 'bg-[#D1FAE5] text-[#10B981]' : row.status === 'duplicate' ? 'bg-[#FEF3C7] text-[#F59E0B]' : row.status === 'error' ? 'bg-[#FEE2E2] text-[#EF4444]' : 'bg-[#E0E7FF] text-[#3B82F6]'}`}>
                        {getInitials(row.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14px] font-bold text-[#0F172A] truncate">{row.name}</span>
                        <span className="text-[12px] font-medium text-[#64748B] truncate">GA – Main Entrance</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0 ml-2">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${row.status === 'success' ? 'bg-[#D1FAE5] text-[#10B981]' : row.status === 'duplicate' ? 'bg-[#FEF3C7] text-[#F59E0B]' : row.status === 'error' ? 'bg-[#FEE2E2] text-[#EF4444]' : 'bg-[#E0E7FF] text-[#3B82F6]'}`}>
                        <span>{statusIcon}</span> {statusLabel}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-[#94A3B8] font-variant-numeric: tabular-nums">
                          {row.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                        <span className="text-[#CBD5E1] text-[16px]">›</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
