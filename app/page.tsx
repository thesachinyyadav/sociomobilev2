"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import { CalendarDays, ArrowRight, Search } from "lucide-react";
import { isDeadlinePassed } from "@/lib/dateUtils";

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="section-header px-1">
      <div className="section-title">
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

  const openRegistrations = [...allEvents]
    .filter((e) => !isDeadlinePassed(e.registration_deadline))
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 6);

  const latestEvents = [...allEvents]
    .sort((a, b) => {
      const at = new Date(b.event_date).getTime();
      const bt = new Date(a.event_date).getTime();
      return at - bt;
    })
    .slice(0, 6);

  const today = new Date(new Date().toDateString());
  const happeningSoon = [...allEvents]
    .filter((e) => {
      const eventDate = new Date(e.event_date);
      const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    })
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 6);

  const festCount = new Set(
    allEvents
      .map((e) => e.fest)
      .filter((value): value is string => !!value && value.toLowerCase() !== "none")
  ).size;

  const featuredEvents = openRegistrations.length > 0 ? openRegistrations : latestEvents;

  // Get unique fest events for "Featured Fests" section
  const festEvents = Array.from(
    new Map(
      allEvents
        .filter((e) => e.fest && e.fest.toLowerCase() !== "none")
        .map((e) => [e.fest, e])
    ).values()
  )
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
    .slice(0, 6);

  // Deduplicate sections: track which events have been shown
  const shownIds = new Set<string>();
  
  // Add open registrations to shown set
  openRegistrations.forEach(e => shownIds.add(e.event_id));
  
  // Filter happening soon to exclude already shown events
  const happeningSoonDedup = happeningSoon.filter(e => !shownIds.has(e.event_id));
  happeningSoonDedup.forEach(e => shownIds.add(e.event_id));
  
  // Filter featured fests to exclude already shown events
  const festEventsDedup = festEvents.filter(e => !shownIds.has(e.event_id));

  const firstName = userData?.name?.split(" ")?.[0] || "there";

  return (
    <div className="pwa-page">
      <div className="px-3 pt-3" style={{ paddingTop: "calc(var(--nav-height) + var(--safe-top) + 12px)" }}>
        <section className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-primary-dark)] to-[var(--color-primary)] text-white px-5 pt-6 pb-5">
          {/* Subtle decorative shapes */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/[0.06]" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/[0.04]" />

          <div className="relative z-10">
            <p className="text-[13px] text-white/70 font-medium">Welcome back, {firstName}</p>
            <h1 className="text-[24px] font-extrabold leading-tight mt-0.5">Find your next event</h1>

            <Link
              href="/discover"
              className="flex items-center gap-3 bg-white rounded-[var(--radius)] px-4 py-3 mt-4 active:scale-[0.98] transition-transform shadow-sm"
            >
              <Search size={16} className="text-[var(--color-text-light)]" />
              <span className="text-[14px] text-[var(--color-text-muted)]">Search events, fests, venues…</span>
            </Link>

            <div className="flex gap-2 mt-4">
              <Link href="/discover" className="flex-1 flex items-center justify-center bg-white/15 rounded-[var(--radius)] px-3 py-2.5 border border-white/20 hover:bg-white/25 transition-colors active:scale-95">
                <span className="text-[12px] font-bold">Discover</span>
              </Link>
              <Link href="/events" className="flex-1 flex items-center justify-center bg-white/15 rounded-[var(--radius)] px-3 py-2.5 border border-white/20 hover:bg-white/25 transition-colors active:scale-95">
                <span className="text-[12px] font-bold">Events</span>
              </Link>
              <Link href="/fests" className="flex-1 flex items-center justify-center bg-white/15 rounded-[var(--radius)] px-3 py-2.5 border border-white/20 hover:bg-white/25 transition-colors active:scale-95">
                <span className="text-[12px] font-bold">Fests</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {allEvents.length > 0 && (
        <section className="mx-5 mt-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center rounded-[var(--radius-lg)]">
              <p className="text-[20px] font-extrabold text-[var(--color-primary)]">{openRegistrations.length}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] font-semibold mt-1.5">Open Now</p>
            </div>
            <div className="card p-4 text-center rounded-[var(--radius-lg)]">
              <p className="text-[20px] font-extrabold text-[var(--color-primary)]">{allEvents.length}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] font-semibold mt-1.5">Total Events</p>
            </div>
            <div className="card p-4 text-center rounded-[var(--radius-lg)]">
              <p className="text-[20px] font-extrabold text-[var(--color-primary)]">{festCount}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] font-semibold mt-1.5">Active Fests</p>
            </div>
          </div>
        </section>
      )}

      {featuredEvents.length > 0 && (
        <section className="mt-6 mx-5">
          <SectionHeader
            title={openRegistrations.length > 0 ? "Open Registrations" : "Featured Events"}
            href="/events"
          />
          <div className="h-scroll px-0 gap-3">
            {featuredEvents.map((e) => (
              <div key={e.event_id} className="w-[260px]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {happeningSoonDedup.length > 0 && (
        <section className="mt-7 mx-5">
          <SectionHeader title="Happening This Week" href="/events" />
          <div className="h-scroll px-0 gap-3">
            {happeningSoonDedup.map((e) => (
              <div key={e.event_id} className="w-[260px]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {festEventsDedup.length > 0 && (
        <section className="mt-7 mx-5">
          <SectionHeader title="Featured Fests" href="/fests" />
          <div className="h-scroll px-0 gap-3">
            {festEventsDedup.map((e) => (
              <div key={e.event_id} className="w-[260px]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-5 mt-7">
        <Link href="/notifications" className="card p-5 flex items-center gap-4 rounded-[var(--radius-lg)] hover:shadow-lg transition-shadow active:scale-95">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-extrabold">Stay Updated</p>
            <p className="text-[12px] text-[var(--color-text-muted)]">Get reminders and registration alerts in Notifications</p>
          </div>
        </Link>
      </section>

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
