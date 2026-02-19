"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import { CalendarDays, ArrowRight } from "lucide-react";
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
        <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-primary-dark)] via-[var(--color-primary)] to-[var(--color-primary)] text-white px-5 pt-5 pb-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0 ring-2 ring-white/10">
              <Image src="/logo.svg" alt="SOCIO" width={40} height={40} priority className="drop-shadow-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] opacity-85 font-medium">Welcome back, {firstName}</p>
              <h1 className="text-[22px] font-extrabold leading-tight">Find your next event</h1>
            </div>
          </div>

          <Link
            href="/discover"
            className="flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-[var(--radius-lg)] px-5 py-3.5 border border-white/25 hover:bg-white/20 transition-colors active:scale-95"
          >
            <span className="text-[14px] opacity-85">Search events, fests, venues...</span>
          </Link>

          <div className="h-scroll gap-3 mt-5 pb-1 px-0">
            <Link href="/discover" className="flex items-center bg-white/15 rounded-[var(--radius-full)] px-4 py-2.5 border border-white/25 hover:bg-white/20 transition-colors">
              <span className="text-[12px] font-semibold">Discover</span>
            </Link>
            <Link href="/events" className="flex items-center bg-white/15 rounded-[var(--radius-full)] px-4 py-2.5 border border-white/25 hover:bg-white/20 transition-colors">
              <span className="text-[12px] font-semibold">Events</span>
            </Link>
            <Link href="/fests" className="flex items-center bg-white/15 rounded-[var(--radius-full)] px-4 py-2.5 border border-white/25 hover:bg-white/20 transition-colors">
              <span className="text-[12px] font-semibold">Fests</span>
            </Link>
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
