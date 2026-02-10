"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import { ArrowRight, Sparkles, CalendarDays, Users, Bell } from "lucide-react";

export default function HomePage() {
  const { session, signInWithGoogle } = useAuth();
  const { allEvents } = useEvents();

  const upcoming = allEvents
    .filter((e) => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 4);

  return (
    <div className="pb-4">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[var(--color-primary-dark)] via-[var(--color-primary)] to-[#1a6bdb] text-white px-5 pt-8 pb-12 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-xs font-medium mb-4 backdrop-blur-sm">
            <Sparkles size={12} className="text-[var(--color-accent)]" />
            University Event Platform
          </div>

          <h1 className="text-3xl font-extrabold leading-tight mb-2">
            Discover.<br />
            <span className="text-[var(--color-accent)]">Register.</span><br />
            Attend.
          </h1>
          <p className="text-sm opacity-80 mb-6 max-w-xs leading-relaxed">
            Your one-stop campus companion for every fest, event, and workshop.
          </p>

          {session ? (
            <Link href="/discover" className="btn btn-accent text-sm">
              Explore events <ArrowRight size={16} />
            </Link>
          ) : (
            <button onClick={signInWithGoogle} className="btn btn-accent text-sm">
              Get started <ArrowRight size={16} />
            </button>
          )}
        </div>
      </section>

      {/* Feature pills */}
      <section className="px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: CalendarDays, label: "Events", color: "bg-blue-50 text-blue-600" },
            { icon: Users, label: "Teams", color: "bg-amber-50 text-amber-600" },
            { icon: Bell, label: "Updates", color: "bg-emerald-50 text-emerald-600" },
          ].map((f) => (
            <div key={f.label} className={`card flex flex-col items-center gap-1.5 py-3 ${f.color}`}>
              <f.icon size={20} />
              <span className="text-[11px] font-semibold">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <section className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-[var(--color-text)]">Upcoming</h2>
            <Link href="/events" className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-0.5">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
            {upcoming.map((e) => (
              <EventCard key={e.event_id} event={e} compact />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-4 mt-8">
        <div className="card bg-gradient-to-br from-[var(--color-primary-dark)] to-[var(--color-primary)] p-5 text-white text-center">
          <Image src="/logo.svg" alt="SOCIO" width={80} height={26} className="mx-auto mb-3 brightness-0 invert" />
          <p className="text-sm opacity-80 mb-4">Never miss a campus event again</p>
          <Link href="/discover" className="btn btn-accent text-sm mx-auto">
            Start exploring
          </Link>
        </div>
      </section>
    </div>
  );
}
