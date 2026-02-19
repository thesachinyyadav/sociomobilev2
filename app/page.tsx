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

  // Get unique fest events for "Explore More" section
  const festEvents = Array.from(
    new Map(
      allEvents
        .filter((e) => e.fest && e.fest.toLowerCase() !== "none")
        .map((e) => [e.fest, e])
    ).values()
  )
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
    .slice(0, 6);

  const firstName = userData?.name?.split(" ")?.[0] || "there";

  return (
    <div className="pwa-page">
      <div className="px-3 pt-3" style={{ paddingTop: "calc(var(--nav-height) + var(--safe-top) + 12px)" }}>
        <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-primary-dark)] via-[var(--color-primary)] to-[var(--color-primary)] text-white px-4 pt-4 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Image src="/logo.svg" alt="SOCIO" width={34} height={34} priority />
            </div>
            <div>
              <p className="text-[13px] opacity-80 font-medium">Welcome back, {firstName}</p>
              <h1 className="text-[22px] font-extrabold leading-tight">Find your next event</h1>
            </div>
          </div>

          <Link
            href="/discover"
            className="flex items-center gap-2.5 bg-white/12 backdrop-blur-sm rounded-[var(--radius)] px-4 py-3 border border-white/20"
          >
            <span className="text-[14px] opacity-80">Search events, fests, venues...</span>
          </Link>

          <div className="h-scroll gap-2.5 mt-4 pb-1">
            <Link href="/discover" className="flex items-center bg-white/12 rounded-[var(--radius-full)] px-4 py-2 border border-white/20">
              <span className="text-[12px] font-semibold">Discover</span>
            </Link>
            <Link href="/events" className="flex items-center bg-white/12 rounded-[var(--radius-full)] px-4 py-2 border border-white/20">
              <span className="text-[12px] font-semibold">Events</span>
            </Link>
            <Link href="/fests" className="flex items-center bg-white/12 rounded-[var(--radius-full)] px-4 py-2 border border-white/20">
              <span className="text-[12px] font-semibold">Fests</span>
            </Link>
          </div>
        </section>
      </div>

      {allEvents.length > 0 && (
        <section className="mx-3 mt-4">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="card p-3 text-center">
              <p className="text-[18px] font-extrabold text-[var(--color-primary)]">{openRegistrations.length}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] font-semibold">Open Now</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-[18px] font-extrabold text-[var(--color-primary)]">{allEvents.length}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] font-semibold">Total Events</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-[18px] font-extrabold text-[var(--color-primary)]">{festCount}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] font-semibold">Active Fests</p>
            </div>
          </div>
        </section>
      )}

      {featuredEvents.length > 0 && (
        <section className="mt-5 mx-3">
          <SectionHeader
            title={openRegistrations.length > 0 ? "Open Registrations" : "Featured Events"}
            href="/events"
          />
          <div className="h-scroll px-1">
            {featuredEvents.map((e) => (
              <div key={e.event_id} className="w-[260px]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {happeningSoon.length > 0 && (
        <section className="mt-6 mx-3">
          <SectionHeader title="Happening This Week" href="/events" />
          <div className="h-scroll px-1">
            {happeningSoon.map((e) => (
              <div key={e.event_id} className="w-[260px]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {festEvents.length > 0 && (
        <section className="mt-6 mx-3">
          <SectionHeader title="Featured Fests" href="/fests" />
          <div className="h-scroll px-1">
            {festEvents.map((e) => (
              <div key={e.event_id} className="w-[260px]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-3 mt-6">
        <Link href="/notifications" className="card p-4 flex items-center gap-3">
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
