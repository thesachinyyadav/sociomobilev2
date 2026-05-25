"use client";

import React from "react";

export default function ScannerSkeleton() {
  return (
    <div className="scan-page animate-fade-in">
      {/* Fake TopBar */}
      <header
        className="sticky top-0 left-0 right-0 z-50 bg-white border-b border-[#E2E8F0]"
        style={{ paddingTop: "var(--safe-top)", backfaceVisibility: "hidden" }}
      >
        <div
          className="relative flex items-center px-4"
          style={{ height: "var(--nav-height)" }}
        >
          <div className="flex-1 flex justify-start">
            <div className="w-[34px] h-[34px] rounded-full skeleton shrink-0" />
          </div>
          <span className="absolute left-1/2 -translate-x-1/2 text-[18px] font-black tracking-tight text-[#011F7B]">
            SOCIO
          </span>
          <div className="flex-1 flex justify-end">
            <div className="w-6 h-6 rounded-full skeleton shrink-0" />
          </div>
        </div>
      </header>

      {/* Navy Event Header Skeleton */}
      <div className="bg-[#011F7B] px-4 pt-3 pb-28 relative z-10 w-full flex-shrink-0 rounded-b-[32px]">
        <div className="flex flex-col gap-4 max-w-[480px] mx-auto">
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-[rgba(255,255,255,0.1)] rounded-xl" />
            <div className="flex-1 h-5 bg-white/20 rounded skeleton" style={{ backgroundImage: "none" }} />
            <div className="flex-shrink-0 w-16 h-6 bg-[rgba(255,255,255,0.08)] rounded-[14px]" />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-16 h-3 bg-white/20 rounded skeleton" style={{ backgroundImage: "none" }} />
            <span className="w-[3px] h-[3px] rounded-full bg-[#94A3B8]" />
            <div className="w-16 h-3 bg-white/20 rounded skeleton" style={{ backgroundImage: "none" }} />
            <span className="w-[3px] h-[3px] rounded-full bg-[#94A3B8]" />
            <div className="w-24 h-3 bg-white/20 rounded skeleton" style={{ backgroundImage: "none" }} />
          </div>
        </div>
      </div>

      {/* Main Column Skeleton */}
      <div className="scan-main-column px-3 -mt-20 relative z-20 pb-20 max-w-[480px] mx-auto w-full flex-shrink-0 flex flex-col gap-4">
        
        {/* Scanner Card Skeleton */}
        <div className="w-full bg-white relative rounded-2xl shadow-[0_12px_40px_rgba(1,31,123,0.08)] p-4 flex flex-col items-center">
          <section
            className="w-full relative rounded-[16px] overflow-hidden skeleton"
            style={{ aspectRatio: '1' }}
          >
            {/* Inner frame lines for realism */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                <div className="absolute inset-0 p-5 pointer-events-none opacity-20">
                   <div className="absolute top-5 left-5 w-9 h-9 border-t-[3px] border-l-[3px] border-[#94A3B8] rounded-tl-[14px]" />
                   <div className="absolute top-5 right-5 w-9 h-9 border-t-[3px] border-r-[3px] border-[#94A3B8] rounded-tr-[14px]" />
                   <div className="absolute bottom-5 left-5 w-9 h-9 border-b-[3px] border-l-[3px] border-[#94A3B8] rounded-bl-[14px]" />
                   <div className="absolute bottom-5 right-5 w-9 h-9 border-b-[3px] border-r-[3px] border-[#94A3B8] rounded-br-[14px]" />
                </div>
            </div>
          </section>

          <div className="mt-4 w-full max-w-[320px] h-[44px] skeleton rounded-[12px]" />
        </div>

        {/* Recent Scans Skeleton */}
        <section className="bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_4px_24px_rgba(15,23,42,0.03)] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F8FAFC]">
            <div className="w-24 h-3 skeleton rounded" />
            <div className="w-12 h-3 skeleton rounded" />
          </div>

          <div className="flex flex-col p-2 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-full skeleton shrink-0" />
                  <div className="flex flex-col space-y-2 flex-1">
                    <div className="w-32 h-3 skeleton rounded" />
                    <div className="w-24 h-2 skeleton rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
