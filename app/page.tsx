"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useEvents, type FetchedEvent } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import { CalendarDays, Compass, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { getDaysUntil, isDeadlinePassed } from "@/lib/dateUtils";

function HeroSection({ name }: { name?: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--color-primary-dark)] via-[var(--color-primary)] to-[#1a6bdb] text-white px-5 pt-6 pb-8">
      {/* Decorative blobs */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/5 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-[var(--color-accent)]/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        <p className="text-sm opacity-80 font-medium animate-fade-up">
          {name ? `Hey, ${name.split(" ")[0]} 👋` : "Welcome to"}
        </p>
        <h1 className="text-[26px] font-extrabold leading-tight mt-0.5 animate-fade-up" style={{ animationDelay: "60ms" }}>
          {name ? "What's happening today?" : "SOCIO"}
        </h1>
        {!name && (
          <p className="text-sm opacity-70 mt-1 animate-fade-up" style={{ animationDelay: "120ms" }}>
            Your campus event companion
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="relative z-10 flex gap-3 mt-5 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <Link
          href="/discover"
          className="flex-1 bg-white/15 backdrop-blur rounded-[var(--radius)] p-3 flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Compass size={18} />
          </div>
          <div>
            <p className="text-[13px] font-bold">Discover</p>
            <p className="text-[11px] opacity-70">Browse all</p>
          </div>
        </Link>
        <Link
          href="/events"
          className="flex-1 bg-white/15 backdrop-blur rounded-[var(--radius)] p-3 flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <CalendarDays size={18} />
          </div>
          <div>
            <p className="text-[13px] font-bold">Events</p>
            <p className="text-[11px] opacity-70">Register now</p>
          </div>
        </Link>
      </div>
    </section>
  );
}

function SectionHeader({ title, icon, href }: { title: string; icon: React.ReactNode; href?: string }) {
  return (
    <div className="flex items-center justify-between px-4 mb-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-[15px] font-extrabold">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-[12px] font-semibold text-[var(--color-primary)] flex items-center gap-0.5">
          See all <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const { userData } = useAuth();
  const { allEvents } = useEvents();

  // Upcoming = future date, not closed registration, sorted soonest first
  const upcoming = allEvents
    .filter((e) => {
      const d = new Date(e.event_date);
      return d >= new Date(new Date().toDateString()) && !isDeadlinePassed(e.registration_deadline);
    })
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 6);

  // Trending = most participants
  const trending = [...allEvents]
    .filter((e) => !isDeadlinePassed(e.registration_deadline))
    .sort((a, b) => (b.total_participants ?? 0) - (a.total_participants ?? 0))
    .slice(0, 6);

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
        <HeroSection name={userData?.name} />
      </div>

      {/* Closing soon */}
      {closingSoon.length > 0 && (
        <section className="mt-6">
          <SectionHeader
            title="Closing Soon"
            icon={<Sparkles size={16} className="text-[var(--color-danger)]" />}
          />
          <div className="h-scroll px-4">
            {closingSoon.map((e) => (
              <div key={e.event_id} className="w-[280px]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mt-7">
          <SectionHeader
            title="Upcoming Events"
            icon={<CalendarDays size={16} className="text-[var(--color-primary)]" />}
            href="/events"
          />
          <div className="h-scroll px-4">
            {upcoming.map((e) => (
              <div key={e.event_id} className="w-[280px]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <section className="mt-7 mb-4">
          <SectionHeader
            title="Trending"
            icon={<TrendingUp size={16} className="text-[var(--color-warning)]" />}
            href="/events"
          />
          <div className="h-scroll px-4">
            {trending.map((e) => (
              <div key={e.event_id} className="w-[280px]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No events fallback */}
      {allEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 animate-bounce-in">
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
