"use client";

import React from "react";
import { ChevronRightIcon as ChevronRight } from "@/components/icons";

export default function ProfileSkeleton() {
  return (
    <div className="pwa-page pb-[calc(var(--bottom-nav)+var(--safe-bottom)+100px)] animate-fade-in">
      {/* Profile header skeleton */}
      <div className="relative overflow-hidden text-white px-5 pt-12 pb-10">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[var(--color-primary-dark)] via-[var(--color-primary)] to-[#3b5bdb]" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-[60px] h-[60px] rounded-full skeleton shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="w-48 h-5 skeleton rounded" />
            <div className="w-32 h-3 skeleton rounded opacity-50" />
            <div className="mt-2 w-20 h-5 skeleton rounded-full" />
          </div>
        </div>
      </div>

      {/* Quick links skeleton */}
      <div className="px-4 -mt-5 relative z-10 grid grid-cols-1 gap-3 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-1 card p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full skeleton shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-24 h-3 skeleton rounded" />
              {i > 0 && <div className="w-32 h-2 skeleton rounded" />}
            </div>
            <ChevronRight size={15} className="text-[var(--color-text-light)]" />
          </div>
        ))}
      </div>

      {/* Info Card skeleton */}
      <div className="px-4 mb-4">
        <div className="card divide-y divide-[var(--color-border)]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-[15px] h-[15px] rounded-sm skeleton shrink-0" />
              <div className="flex-1 space-y-1.5 py-1">
                <div className="w-16 h-2 skeleton rounded" />
                <div className="w-32 h-3 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Registered events skeleton */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 skeleton rounded-full" />
          <div className="w-32 h-4 skeleton rounded" />
          <div className="ml-auto w-6 h-6 skeleton rounded-full" />
        </div>
        
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card p-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-sm)] skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-40 h-3 skeleton rounded" />
                  <div className="w-24 h-2 skeleton rounded" />
                  <div className="w-32 h-2 skeleton rounded" />
                </div>
                <div className="w-16 h-5 skeleton rounded-full shrink-0" />
              </div>
              <div className="mt-3 flex gap-2">
                <div className="h-8 flex-1 skeleton rounded-[var(--radius)]" />
                <div className="h-8 flex-1 skeleton rounded-[var(--radius)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}