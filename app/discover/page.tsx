"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { Search, SlidersHorizontal, X, CalendarDays, PartyPopper, Layers } from "lucide-react";
import { isDeadlinePassed } from "@/lib/dateUtils";

const CATEGORIES = ["All", "Technical", "Cultural", "Sports", "Workshop", "Seminar", "Other"] as const;

export default function DiscoverPage() {
  const { allEvents, isLoading } = useEvents();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showOpen, setShowOpen] = useState(false);

  /* Unique fests */
  const fests = useMemo(() => {
    const map = new Map<string, string>();
    allEvents.forEach((e) => {
      if (e.fest) map.set(e.fest, e.fest);
    });
    return Array.from(map.values());
  }, [allEvents]);

  /* Filter */
  const filtered = useMemo(() => {
    let list = allEvents;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q) ||
          e.fest?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q)
      );
    }
    if (category !== "All") {
      list = list.filter((e) => e.category?.toLowerCase() === category.toLowerCase());
    }
    if (showOpen) {
      list = list.filter((e) => !isDeadlinePassed(e.registration_deadline));
    }
    return list.sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [allEvents, search, category, showOpen]);

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top)+8px)]">
      {/* Search */}
      <div className="px-4 mb-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-light)]"
          />
          <input
            type="text"
            placeholder="Search events, fests, venues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 pr-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-light)]"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="h-scroll px-4 mb-4">
        <Link
          href="/events"
          className="chip bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold gap-1.5 px-3 py-2"
        >
          <CalendarDays size={13} /> Events
        </Link>
        <Link
          href="/fests"
          className="chip bg-amber-50 text-amber-700 font-bold gap-1.5 px-3 py-2"
        >
          <PartyPopper size={13} /> Fests
        </Link>
        <button
          onClick={() => setShowOpen(!showOpen)}
          className={`chip font-bold gap-1.5 px-3 py-2 ${
            showOpen
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-[var(--color-text-muted)]"
          }`}
        >
          <SlidersHorizontal size={13} /> {showOpen ? "Open only" : "All status"}
        </button>
      </div>

      {/* Category chips */}
      <div className="h-scroll px-4 mb-4 gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`chip px-3 py-1.5 text-[12px] font-semibold border transition-colors ${
              category === c
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                : "bg-white text-[var(--color-text-muted)] border-[var(--color-border)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Fests marquee */}
      {fests.length > 0 && (
        <div className="px-4 mb-5">
          <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            Active Fests
          </p>
          <div className="h-scroll gap-2">
            {fests.map((f) => (
              <Link
                key={f}
                href="/fests"
                className="chip bg-gradient-to-r from-[var(--color-primary)] to-[#1a6bdb] text-white px-3 py-1.5 text-[11px]"
              >
                <Layers size={11} /> {f}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="px-4 space-y-3">
          <Skeleton className="h-48 w-full rounded-[var(--radius)]" count={3} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={28} className="text-[var(--color-primary)]" />}
          title="No events found"
          subtitle="Try changing your search or filters"
        />
      ) : (
        <div className="px-4 space-y-3 stagger">
          {filtered.map((e) => (
            <EventCard key={e.event_id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
