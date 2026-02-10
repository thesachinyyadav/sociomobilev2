"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDateShort, formatTime, getDaysUntil } from "@/lib/dateUtils";
import { MapPin, Clock, Users, Tag, Globe } from "lucide-react";
import type { FetchedEvent } from "@/context/EventContext";

interface Props {
  event: FetchedEvent;
  compact?: boolean;
}

export default function EventCard({ event, compact }: Props) {
  const daysLeft = getDaysUntil(event.registration_deadline);
  const isPast = daysLeft !== null && daysLeft < 0;
  const isFree = !event.registration_fee || event.registration_fee <= 0;

  return (
    <Link href={`/event/${event.event_id}`}>
      <div className="card animate-fade-up group">
        {/* Image */}
        <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
          <Image
            src={
              event.event_image_url ||
              event.banner_url ||
              "https://placehold.co/400x225/e2e8f0/94a3b8?text=Event"
            }
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, 50vw"
          />

          {/* Chips overlay */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {isFree ? (
              <span className="chip bg-emerald-500 text-white">Free</span>
            ) : (
              <span className="chip bg-[var(--color-accent)] text-[var(--color-primary-dark)]">
                ₹{event.registration_fee}
              </span>
            )}
            {event.allow_outsiders && (
              <span className="chip bg-white/90 text-[var(--color-primary)]">
                <Globe size={10} /> Open
              </span>
            )}
            {event.claims_applicable && (
              <span className="chip bg-teal-500/90 text-white">Claims</span>
            )}
          </div>

          {/* Deadline badge */}
          {daysLeft !== null && !isPast && daysLeft <= 3 && (
            <div className="absolute bottom-2 right-2">
              <span className="chip bg-red-500 text-white animate-pulse-ring">
                {daysLeft === 0 ? "Last day!" : `${daysLeft}d left`}
              </span>
            </div>
          )}
          {isPast && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="chip bg-white/90 text-gray-700 text-xs">
                Closed
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`p-3 ${compact ? "pb-2" : "pb-4"}`}>
          <h3 className="font-bold text-[15px] leading-snug text-[var(--color-text)] line-clamp-2 mb-1.5">
            {event.title}
          </h3>

          <div className="flex flex-col gap-1 text-[12px] text-[var(--color-text-muted)]">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="shrink-0" />
              <span>{formatDateShort(event.event_date)}</span>
              {event.event_time && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{formatTime(event.event_time)}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{event.venue || "TBD"}</span>
            </div>

            {!compact && (
              <div className="flex items-center gap-3 mt-1">
                {event.category && (
                  <div className="flex items-center gap-1">
                    <Tag size={11} />
                    <span>{event.category}</span>
                  </div>
                )}
                {event.participants_per_team > 1 && (
                  <div className="flex items-center gap-1">
                    <Users size={11} />
                    <span>Team of {event.participants_per_team}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
