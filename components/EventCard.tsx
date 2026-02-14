"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock, Users, Tag } from "lucide-react";
import type { FetchedEvent } from "@/context/EventContext";
import { formatDateShort, formatTime, getDaysUntil, isDeadlinePassed } from "@/lib/dateUtils";

export default function EventCard({ event }: { event: FetchedEvent }) {
  const daysLeft = getDaysUntil(event.registration_deadline);
  const closed = isDeadlinePassed(event.registration_deadline);
  const isFree = !event.registration_fee || event.registration_fee === 0;

  return (
    <Link href={`/event/${event.event_id}`} className="card block animate-fade-up">
      {/* Image */}
      <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
        {event.event_image_url || event.banner_url ? (
          <Image
            src={(event.banner_url || event.event_image_url)!}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width:480px) 100vw, 50vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center">
            <span className="text-white/60 text-3xl font-black">
              {event.title.charAt(0)}
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          {isFree ? (
            <span className="chip bg-green-500 text-white">FREE</span>
          ) : (
            <span className="chip bg-white/90 text-[var(--color-text)]">₹{event.registration_fee}</span>
          )}
          {event.category && (
            <span className="chip bg-white/90 text-[var(--color-text)]">
              <Tag size={10} /> {event.category}
            </span>
          )}
        </div>

        {/* Deadline hint */}
        {!closed && daysLeft !== null && daysLeft <= 3 && daysLeft >= 0 && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
            <span className="text-[11px] font-bold text-white">
              {daysLeft === 0 ? "Last day to register!" : `${daysLeft}d left to register`}
            </span>
          </div>
        )}
        {closed && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
            <span className="text-[11px] font-bold text-red-300">Registration closed</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3.5">
        <h3 className="text-[14px] font-bold leading-snug line-clamp-1">{event.title}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[12px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDateShort(event.event_date)}
            {event.event_time && ` · ${formatTime(event.event_time)}`}
          </span>
          {event.venue && (
            <span className="flex items-center gap-1 truncate max-w-[140px]">
              <MapPin size={12} /> {event.venue}
            </span>
          )}
        </div>
        {event.fest && (
          <p className="mt-1.5 text-[11px] font-semibold text-[var(--color-primary)]">
            {event.fest}
          </p>
        )}
        {event.participants_per_team > 1 && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-[var(--color-text-light)]">
            <Users size={11} /> Team of {event.participants_per_team}
          </span>
        )}
      </div>
    </Link>
  );
}
