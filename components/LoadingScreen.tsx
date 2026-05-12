import React from "react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[linear-gradient(180deg,rgba(2,17,74,0.9)_0%,rgba(0,10,49,0.9)_100%)]">
      <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
        <div className="text-[13px] font-black tracking-[0.32em] text-[#e7f0ff] animate-pulse">
          SOCIO
        </div>
        <p className="mt-1 text-center text-[10px] text-blue-100/80">Preparing your campus…</p>
      </div>
    </div>
  );
}
