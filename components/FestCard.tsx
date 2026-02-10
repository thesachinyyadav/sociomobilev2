"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDateRange } from "@/lib/dateUtils";
import { CalendarDays, Building2 } from "lucide-react";
import type { Fest } from "@/context/EventContext";

export function FestCard({ fest }: { fest: Fest }) {
  return (
    <Link href={`/fest/${fest.fest_id}`}>
      <div className="card animate-fade-up group">
        <div className="relative aspect-[16/10] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] overflow-hidden">
          {fest.fest_image_url ? (
            <Image
              src={fest.fest_image_url}
              alt={fest.fest_title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <CalendarDays size={48} className="text-white/20" />
            </div>
          )}
          {fest.category && (
            <span className="absolute top-2 left-2 chip bg-[var(--color-accent)] text-[var(--color-primary-dark)]">
              {fest.category}
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-bold text-[15px] leading-snug text-[var(--color-text)] line-clamp-2 mb-1">
            {fest.fest_title}
          </h3>
          <div className="flex flex-col gap-1 text-[12px] text-[var(--color-text-muted)]">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={12} className="shrink-0" />
              <span>{formatDateRange(fest.opening_date, fest.closing_date)}</span>
            </div>
            {fest.organizing_dept && (
              <div className="flex items-center gap-1.5">
                <Building2 size={12} className="shrink-0" />
                <span className="truncate">{fest.organizing_dept}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
