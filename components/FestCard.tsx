"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarIcon, UsersIcon, TrendingUpIcon } from "@/components/icons";
import type { Fest } from "@/context/EventContext";
import { formatDateRange } from "@/lib/dateUtils";

function formatCompactCount(count: number) {
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count >= 1_000_000) {
    const value = count / 1_000_000;
    return `${parseFloat(value.toFixed(value >= 10 ? 0 : 1))}m`;
  }
  if (count >= 1_000) {
    const value = count / 1_000;
    return `${parseFloat(value.toFixed(value >= 10 ? 0 : 1))}k`;
  }
  return `${Math.round(count)}`;
}

type FestWithAttendance = Fest & {
  total_participants?: number | null;
  total_registrations?: number | null;
  registrations?: number | null;
  attendees?: number | null;
  attendee_count?: number | null;
};

export default function FestCard({
  fest,
  tier = "elevated",
  isTrending,
}: {
  fest: Fest;
  tier?: "hero" | "elevated" | "standard";
  isTrending?: boolean;
}) {
  const rawId = fest.slug || fest.fest_id;
  // Guard: do not render a broken link if the fest has no navigable ID
  if (!rawId) return null;

  const href = `/fest/${rawId}`;
  const img = fest.fest_image_url || fest.banner_url || fest.image_url;
  const title = fest.fest_title || fest.name || "Fest";
  const dept = fest.organizing_dept || fest.department;
  const festWithAttendance = fest as FestWithAttendance;
  const attendeeCountRaw = Number(
    festWithAttendance.total_participants ??
      festWithAttendance.total_registrations ??
      festWithAttendance.registrations ??
      festWithAttendance.attendees ??
      festWithAttendance.attendee_count ??
      0
  );
  const attendeeCount = Number.isFinite(attendeeCountRaw)
    ? Math.max(0, attendeeCountRaw)
    : 0;
  const attendeeLabel = formatCompactCount(attendeeCount);

  // Tier-based styles
  const isHero = tier === "hero";
  const isElevated = tier === "elevated";

  const cardClasses = `relative block w-full group cursor-pointer overflow-hidden rounded-2xl transition-all duration-150 active:scale-[0.97] will-change-transform ${
    isHero 
      ? "h-[280px] shadow-xl border-none" 
      : isElevated
        ? "h-[220px] shadow-md border border-white/20"
        : "h-[180px] shadow-sm border border-[var(--color-border)]"
  }`;

  return (
    <Link href={href} className={cardClasses}>
      <Image
        src={
          img ||
          [
            "https://images.unsplash.com/photo-1540509210214-411fb26dcf5a?q=80&w=1000&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=1000&auto=format&fit=crop"
          ][(title.charCodeAt(0) || 0) % 4]
        }
        alt={title}
        fill
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.03]"
        sizes="(max-width:480px) 100vw, 50vw"
      />
      
      {/* Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t ${isHero ? "from-black/90 via-black/40 to-transparent" : "from-black/60 to-transparent"}`}></div>
      
      {/* Top Badges */}
      <div className="absolute top-3 left-3 flex flex-col items-start gap-2 z-10">
        {isTrending && (
          <div className="bg-black/50 backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-sm border border-white/10">
            <TrendingUpIcon className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-white text-[10px] font-bold capitalize">Trending</span>
          </div>
        )}
      </div>

      <div className={`absolute inset-0 flex flex-col justify-between ${isHero ? "p-5" : "p-4"}`}>
        <div className="flex justify-between items-start">
          {/* Badge 2 (Category/Department fallback) */}
          <div className="mt-8">
            {fest.category ? (
              <span className="bg-[#154cb3]/90 backdrop-blur text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                {fest.category}
              </span>
            ) : dept ? (
              <span className="bg-black/40 backdrop-blur text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                {dept}
              </span>
            ) : null}
          </div>
          
          {/* Attendee Indicator */}
          {attendeeCount > 0 && (
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white/90 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-sm">
              <UsersIcon size={12} />
              {attendeeLabel} going
            </div>
          )}
        </div>
        
        <div>
          <h3 className={`${isHero ? "text-[28px] drop-shadow-lg" : "text-xl drop-shadow-md"} font-black text-white leading-tight mb-2`}>
            {title}
          </h3>
          <div className={`flex items-center gap-1.5 text-white/80 ${isHero ? "text-[13px]" : "text-[11px]"} font-bold tracking-wider uppercase`}>
            <CalendarIcon size={14} />
            <span>
              {formatDateRange(
                fest.opening_date || fest.start_date,
                fest.closing_date || fest.end_date
              )}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
