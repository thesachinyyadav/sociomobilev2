"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { Search, X, CalendarDays, Filter, Check } from "lucide-react";
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
    return Array.from(map.values()).sort();
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
      {/* Header */}
      <div className="px-4 pt-2 pb-3">
        <h1 className="text-[20px] font-extrabold">Discover</h1>
      </div>

      {/* Search bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-light)]"
          />
          <input
            type="text"
            placeholder="Search events, fests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 pr-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-light)] hover:text-[var(--color-text)]"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Quick filters */}
      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={() => setShowOpen(!showOpen)}
          className={`chip font-bold gap-1.5 px-3 py-2 border text-[12px] transition-all flex-1 ${
            showOpen
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-white text-[var(--color-text-muted)] border-[var(--color-border)]"
          }`}
        >
          <Filter size={13} />
          {showOpen ? "Open Only" : "All Events"}
        </button>
      </div>

      {/* Category filter - compact horizontal scroll */}
      <div className="h-scroll px-4 pb-3 gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`chip px-3 py-1.5 text-[11px] font-bold border transition-all whitespace-nowrap ${
              category === c
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                : "bg-white text-[var(--color-text-muted)] border-[var(--color-border)]"
            }`}
          >
            {category === c && <Check size={11} className="inline mr-0.5" />}
            {c}
          </button>
        ))}
      </div>

      {/* Fests section - compact */}
      {fests.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-bold text-[var(--color-text-light)] uppercase tracking-widest mb-2">
            Active Fests
          </p>
          <div className="h-scroll gap-1.5">
            {fests.map((f) => (
              <Link
                key={f}
                href="/fests"
                className="chip bg-gradient-to-br from-[var(--color-primary)] to-[#1a6bdb] text-white px-3 py-1.5 text-[11px] font-bold whitespace-nowrap"
              >
                {f}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="h-px bg-[var(--color-border)] my-2" />

      {/* Stats line */}
      {!isLoading && (
        <div className="px-4 py-2 text-[11px] text-[var(--color-text-muted)] font-semibold">
          {filtered.length} {filtered.length === 1 ? "event" : "events"} found
        </div>
      )}

      {/* Results grid */}
      {isLoading ? (
        <div className="px-3 space-y-2.5">
          <Skeleton className="h-40 w-full rounded-[var(--radius)]" count={3} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={28} className="text-[var(--color-primary)]" />}
          title="No events found"
          subtitle="Try changing your search or filters"
        />
      ) : (
        <div className="px-3 space-y-2.5 pb-8">
          {filtered.map((e) => (
            <EventCard key={e.event_id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

