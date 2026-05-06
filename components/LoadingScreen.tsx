import Image from "next/image";
import React from "react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
      <div className="text-[15px] font-black tracking-[0.35em] text-[#154CB3] animate-pulse">
        SOCIO
      </div>
    </div>
  );
}
