"use client";

import { memo } from "react";

import ShimmerImage from "./ShimmerImage";
import Link from "next/link";
import { MapPinIcon, ClockIcon, UsersIcon, TrendingUpIcon, ShareIcon } from "@/components/icons";
import type { FetchedEvent } from "@/context/EventContext";
import { formatDateShort, formatTime, getDaysUntil, isDeadlinePassed } from "@/lib/dateUtils";
import { shareEvent } from "@/lib/share";

const EventCard = memo(function EventCard({
  event,
  compact,
  featured,
  showAction,
  isTrending,
}: {
  event: FetchedEvent;
  compact?: boolean;
  featured?: boolean;
  showAction?: boolean;
  isTrending?: boolean;
}) {
  // Guard: do not render a broken link if event has no valid ID
  if (!event?.event_id) return null;

  const daysLeft = getDaysUntil(event.registration_deadline);
  const closed = isDeadlinePassed(event.registration_deadline);
  const isFree = !event.registration_fee || event.registration_fee === 0;

  // Compact variant for profile registrations
  if (compact) {
    return (
      <Link href={`/event/${event.event_id}`} className="flex gap-3 items-center p-3 bg-white rounded-[var(--radius)] shadow-[var(--shadow-xs)] animate-fade-up group">
        <div className="relative w-16 h-16 rounded-[var(--radius-sm)] overflow-hidden shrink-0 bg-gray-100">
          {(event.banner_url || event.event_image_url) ? (
            <ShimmerImage src={(event.banner_url || event.event_image_url)!} alt={event.title} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[#1a6bdb] flex items-center justify-center">
              <span className="text-white font-bold text-sm">{event.title.charAt(0)}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-extrabold leading-tight line-clamp-1">{event.title}</h4>
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
        <div className="shrink-0">
          {!closed && (
            isFree ? (
              <span className="tag tag-free">Free</span>
            ) : (
              <span className="tag tag-paid">₹{event.registration_fee}</span>
            )
          )}
        </div>
      </Link>
    );
  }

  const cardClasses = `block animate-fade-up group bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] overflow-hidden transition-transform duration-200 active:scale-[0.96] ${featured ? 'card-hero' : ''}`;

  return (
    <Link href={`/event/${event.event_id}`} className={cardClasses}>
      {/* Premium Operational Hero Image Container */}
      <div className="relative overflow-hidden rounded-t-[inherit] aspect-[4/3] md:aspect-[16/10] lg:aspect-[16/9] bg-[#011F7B]">
        {/* Background Event Image */}
        {event.event_image_url || event.banner_url ? (
          <ShimmerImage
            src={(event.banner_url || event.event_image_url)!}
            alt={event.title}
            fill
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            sizes="(max-width:480px) 100vw, 50vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#011F7B] to-[#020617]" />
        )}

        {/* Cinematic Gradient Overlay */}
        <div 
          className="absolute inset-0 z-[1]" 
          style={{
            background: "linear-gradient(180deg, rgba(1, 31, 123, 0.08) 0%, rgba(1, 31, 123, 0.45) 55%, rgba(2, 6, 23, 0.82) 100%)"
          }}
        />

        {/* Safe Content Area */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-5 md:p-6">
          {/* Top Row: Price Badge & Share Button */}
          <div className="flex justify-between items-start w-full">
            {/* Operational Price Badge */}
            <div>
              {!closed && (
                isFree ? (
                  <span className="inline-flex items-center rounded-full bg-[#FFF9E6] text-[#745B00] font-bold px-3 py-1 text-[11px] shadow-sm uppercase tracking-wider border border-[#FFE599]/30">
                    FREE
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-[#FFF9E6] text-[#745B00] font-bold px-3 py-1 text-[11px] shadow-sm border border-[#FFE599]/30">
                    ₹{event.registration_fee}
                  </span>
                )
              )}
            </div>

            {/* Share Button with Glassmorphism */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void shareEvent({
                  title: event.title,
                  text: `Check out this event: ${event.title}`,
                  url: `/event/${event.event_id}`,
                });
              }}
              className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white shadow-sm border border-white/20 active:scale-90 hover:bg-white/20 transition-all"
              aria-label="Share Event"
            >
              <ShareIcon size={14} />
            </button>
          </div>

          {/* Bottom Column: Title & Optional Subtitle */}
          <div className="flex flex-col gap-1 mt-auto max-w-[calc(100%-8px)]">
            {/* Optional Subtitle */}
            {event.category && (
              <span className="text-[10px] font-bold tracking-widest text-amber-300 uppercase">
                {event.category}
              </span>
            )}

            {/* Event Title */}
            <h3 
              className="text-white font-extrabold line-clamp-2 overflow-hidden text-ellipsis max-w-full"
              style={{
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                fontSize: "clamp(1.25rem, 4.5vw, 2.25rem)",
                wordBreak: "break-word"
              }}
            >
              {event.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className={featured ? "p-5" : "p-4"}>
        {/* Date / Time */}
        <p className="text-[10px] font-bold tracking-widest text-[var(--color-text-light)] uppercase flex items-center gap-1 mb-2.5">
          <ClockIcon size={10} />
          {formatDateShort(event.event_date)}
          {event.event_time && ` • ${formatTime(event.event_time)}`}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2">
          {(event.organizing_dept || event.fest) && (
            <span className="chip bg-gray-100 text-[var(--color-text-muted)] text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm">
              {event.organizing_dept || event.fest}
            </span>
          )}
        </div>

        {/* Footer (Social Proof & CTA) */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(event.total_participants != null && event.total_participants > 0) ? (
              <>
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-black/5 text-black/40 border border-black/10">
                  <UsersIcon size={12} />
                </div>
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                  +{event.total_participants} Attending
                </span>
              </>
            ) : (
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)] flex items-center gap-1">
                {event.venue ? <><MapPinIcon size={11} /> {event.venue}</> : 'Details inside'}
              </span>
            )}
          </div>
          
          {showAction && (
            <span className={`btn-active-state shrink-0 inline-flex items-center justify-center rounded-lg font-bold transition-all ${
              closed 
                ? "bg-slate-100 text-slate-400 px-3 py-1.5 text-[12px] opacity-90 cursor-not-allowed" 
                : "bg-[var(--color-accent)] text-[var(--color-primary-dark)] px-4 py-1.5 text-[12px] hover:bg-[var(--color-accent-dark)] hover:text-white"
            }`}>
              {closed ? "Closed" : "Grab Ticket"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});

export default EventCard;
