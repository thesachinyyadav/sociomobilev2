"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPinIcon, ClockIcon, UsersIcon, TrendingUpIcon } from "@/components/icons";
import type { FetchedEvent } from "@/context/EventContext";
import { formatDateShort, formatTime, getDaysUntil, isDeadlinePassed } from "@/lib/dateUtils";

export default function EventCard({
  event,
  compact,
  tier = "standard",
  showAction = true,
  isTrending,
}: {
  event: FetchedEvent;
  compact?: boolean;
  tier?: "hero" | "elevated" | "standard";
  showAction?: boolean;
  isTrending?: boolean;
}) {
  if (!event?.event_id) return null;

  const daysLeft = getDaysUntil(event.registration_deadline);
  const closed = isDeadlinePassed(event.registration_deadline);
  const isFree = !event.registration_fee || event.registration_fee === 0;

  if (compact) {
    return (
      <Link href={`/event/${event.event_id}`} className="flex gap-3 items-center p-3 bg-white rounded-[var(--radius)] shadow-sm animate-fade-up group">
        <div className="relative w-16 h-16 rounded-[var(--radius-sm)] overflow-hidden shrink-0 bg-gray-100">
          {(event.banner_url || event.event_image_url) ? (
            <Image src={(event.banner_url || event.event_image_url)!} alt={event.title || "Event"} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[#1a6bdb] flex items-center justify-center">
              <span className="text-white font-bold text-sm">{event.title?.charAt(0) || "E"}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-extrabold leading-tight line-clamp-1">{event.title || "Untitled Event"}</h4>
          <p className="text-[11px] font-medium text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
            <ClockIcon size={10} /> {formatDateShort(event.event_date)}
            {event.event_time && ` · ${formatTime(event.event_time)}`}
          </p>
          {event.venue && (
            <p className="text-[11px] text-[var(--color-text-light)] mt-0.5 flex items-center gap-1 truncate">
              <MapPinIcon size={10} /> {event.venue}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // Tier-based styles
  const isHero = tier === "hero";
  const isElevated = tier === "elevated";

  const cardClasses = `block animate-fade-up group rounded-2xl overflow-hidden transition-all duration-150 active:scale-[0.97] will-change-transform ${
    isHero 
      ? "bg-black text-white shadow-xl" 
      : isElevated
        ? "bg-[var(--color-surface)] border border-[var(--color-border)] shadow-md text-[var(--color-text)]"
        : "bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm text-[var(--color-text)]"
  }`;

  return (
    <Link href={`/event/${event.event_id}`} className={cardClasses}>
      {/* Banner */}
      <div className={`relative ${isHero ? "aspect-[4/3] sm:aspect-[16/9]" : "aspect-[16/9]"} bg-gray-100 overflow-hidden`}>
        {event.event_image_url || event.banner_url ? (
          <Image
            src={(event.banner_url || event.event_image_url)!}
            alt={event.title || "Event"}
            fill
            className="object-cover transition-transform duration-500 ease-out will-change-transform"
            sizes="(max-width:480px) 100vw, 50vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
            <span className="text-white/50 text-4xl font-black">
              {event.title?.charAt(0) || "E"}
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t ${isHero ? "from-black/90 via-black/40 to-transparent" : "from-black/60 to-transparent"}`} />

        {/* Top Badges (Max 2: Category, Status) */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-2 z-[1]">
          {isTrending && (
            <div className="bg-black/50 backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-sm border border-white/10">
              <TrendingUpIcon className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-white text-[10px] font-bold capitalize">Trending</span>
            </div>
          )}
          
          {!closed && isFree && (
            <div className="bg-white text-emerald-700 rounded-full px-2.5 py-1 shadow-sm font-bold text-[10px] capitalize">
              Free
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={`flex flex-col justify-between ${isHero ? "p-5 absolute bottom-0 left-0 right-0 z-10" : "p-4"}`}>
        <div>
          {/* Metadata */}
          <div className={`flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase mb-2 ${isHero ? "text-white/80" : "text-[var(--color-text-light)]"}`}>
            <ClockIcon size={12} />
            <span>{formatDateShort(event.event_date)}{event.event_time && ` • ${formatTime(event.event_time)}`}</span>
          </div>

          {/* Title */}
          <h3 className={`leading-tight line-clamp-2 ${isHero ? "text-[24px] font-black drop-shadow-md" : "text-[16px] font-extrabold"}`}>
            {event.title || "Untitled Event"}
          </h3>
          
          {/* Category Chip (Badge 2 fallback) */}
          {!isHero && event.category && (
            <div className="mt-2.5">
              <span className="bg-gray-100 text-[var(--color-text-muted)] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                {event.category}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`mt-4 flex items-center justify-between ${!isHero ? "pt-4 border-t border-gray-100" : "pt-2"}`}>
          <div className="flex items-center gap-2">
            {(event.total_participants != null && event.total_participants > 0) ? (
              <div className="bg-black/50 backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1.5 text-white/90">
                <UsersIcon size={12} />
                <span className="text-[11px] font-bold">{formatCompactCount(event.total_participants)} going</span>
              </div>
            ) : (
              <span className={`text-[11px] font-semibold flex items-center gap-1 ${isHero ? "text-white/70" : "text-[var(--color-text-muted)]"}`}>
                {event.venue ? <><MapPinIcon size={12} /> {event.venue}</> : 'Details inside'}
              </span>
            )}
          </div>
          
          {showAction && (
            <button 
              disabled={closed}
              className={`shrink-0 inline-flex items-center justify-center rounded-xl font-bold transition-all duration-150 will-change-transform active:scale-95 ${
              closed 
                ? "bg-slate-200 text-slate-400 px-4 py-2 text-[12px] cursor-not-allowed shadow-none" 
                : isHero
                  ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white px-5 py-2 text-[13px] shadow-lg shadow-[var(--color-primary)]/20"
                  : "bg-[var(--color-primary)] text-white px-4 py-2 text-[12px] shadow-sm hover:shadow-md"
            }`}>
              {closed ? "Closed" : isHero ? "Register Now" : "Register"}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

function formatCompactCount(count: number): string {
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
