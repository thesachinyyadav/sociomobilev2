"use client";

import Image from "next/image";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4">
      <Image
        src="/logo.svg"
        alt="SOCIO"
        width={120}
        height={38}
        priority
        className="animate-pulse-ring"
      />
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-[var(--color-primary)]"
            style={{
              animation: "pulse-ring 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
