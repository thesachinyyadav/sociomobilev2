"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useEvents, type FetchedEvent } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import { CalendarDays, Compass, TrendingUp, ArrowRight, Sparkles, Zap, PartyPopper, Search } from "lucide-react";
import { getDaysUntil, isDeadlinePassed } from "@/lib/dateUtils";

/* ── Hero Banner ── */
function HeroBanner({ name }: { name?: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--color-primary-dark)] via-[var(--color-primary)] to-[#1a6bdb] text-white">
      {/* Decorative glow circles */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-[var(--color-primary)]/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--color-accent)]/10 rounded-full blur-3xl" />

      <div className="relative z-10 px-5 pt-5 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <Image src="/logo.svg" alt="SOCIO" width={36} height={36} />
          <div>
            <p className="text-[13px] opacity-70 font-medium">
              {name ? `Hey, ${name.split(" ")[0]} 👋` : "Welcome to SOCIO"}
            </p>
            <h1 className="text-[18px] font-extrabold leading-tight">
              {name ? "What's on today?" : "Campus Events Hub"}
            </h1>
          </div>
        </div>

        {/* Search bar (redirects to discover) */}
        <Link
          href="/discover"
          className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-[var(--radius)] px-4 py-2.5 border border-white/10"
        >
          <Search size={16} className="opacity-50" />
          <span className="text-[13px] opacity-50">Search events, fests, venues…</span>
        </Link>
      </div>

      {/* Quick action pills */}
      <div className="relative z-10 h-scroll px-5 pb-4 gap-2.5">
        <Link href="/discover" className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-[var(--radius-full)] px-4 py-2 border border-white/10">
          <Compass size={15} />
          <span className="text-[12px] font-semibold">Discover</span>
        </Link>
        <Link href="/events" className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-[var(--radius-full)] px-4 py-2 border border-white/10">
          <CalendarDays size={15} />
          <span className="text-[12px] font-semibold">Events</span>
        </Link>
        <Link href="/fests" className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-[var(--radius-full)] px-4 py-2 border border-white/10">
          <PartyPopper size={15} />
          <span className="text-[12px] font-semibold">Fests</span>
        </Link>
      </div>
    </section>
  );
}

/* ── Section Header ── */
function SectionHeader({ title, icon, href, accent }: { title: string; icon: React.ReactNode; href?: string; accent?: string }) {
  return (
    <div className="section-header">
      <div className="section-title">
        {icon}
        <span>{title}</span>
      </div>
      {href && (
        <Link href={href} className="section-link">
          See All <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const { userData } = useAuth();
  const { allEvents } = useEvents();

  // Upcoming = future date, open registration, sorted soonest first
  const upcoming = allEvents
    .filter((e) => {
      const d = new Date(e.event_date);
      return d >= new Date(new Date().toDateString()) && !isDeadlinePassed(e.registration_deadline);
    })
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 8);

  // Trending = most participants
  const trending = [...allEvents]
    .filter((e) => !isDeadlinePassed(e.registration_deadline))
    .sort((a, b) => (b.total_participants ?? 0) - (a.total_participants ?? 0))
    .slice(0, 8);

  // Closing soon = deadline within 3 days
  const closingSoon = allEvents
    .filter((e) => {
      const d = getDaysUntil(e.registration_deadline);
      return d !== null && d >= 0 && d <= 3;
    })
    .sort((a, b) => {
      const da = getDaysUntil(a.registration_deadline) ?? 99;
      const db = getDaysUntil(b.registration_deadline) ?? 99;
      return da - db;
    })
    .slice(0, 6);

  return (
    <div className="pwa-page">
      {/* Hero */}
      <div style={{ paddingTop: "calc(var(--nav-height) + var(--safe-top))" }}>
        <HeroBanner name={userData?.name} />
      </div>

      {/* Closing Soon — urgent section */}
      {closingSoon.length > 0 && (
        <section className="mt-5">
          <SectionHeader
            title="Closing Soon"
            icon={<Zap size={15} className="text-[var(--color-danger)]" />}
          />
          <div className="h-scroll px-4">
            {closingSoon.map((e) => (
              <div key={e.event_id} className="w-[260px]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {upcoming.length > 0 && (
        <section className="mt-6">
          <SectionHeader
            title="Upcoming Events"
            icon={<CalendarDays size={15} className="text-[var(--color-primary)]" />}
            href="/events"
          />
          <div className="h-scroll px-4">
            {upcoming.map((e) => (
              <div key={e.event_id} className="w-[260px]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <section className="mt-6 mb-4">
          <SectionHeader
            title="Trending Now"
            icon={<TrendingUp size={15} className="text-[var(--color-warning)]" />}
            href="/events"
          />
          <div className="h-scroll px-4">
            {trending.map((e) => (
              <div key={e.event_id} className="w-[260px]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No events fallback */}
      {allEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mb-4 animate-bounce-in">
            <CalendarDays size={28} className="text-[var(--color-primary)]" />
          </div>
          <p className="text-base font-bold">No events yet</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Check back soon for upcoming campus events!
          </p>
        </div>
      )}
    </div>
  );
}
