"use client";

import { useState, useMemo } from "react";
import { useEvents, type FetchedEvent, type Fest } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import { FestCard } from "@/components/FestCard";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/Skeleton";
import { Search, SlidersHorizontal, Sparkles, CalendarDays, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CATEGORIES = ["All", "Academic", "Cultural", "Sports", "Literary", "Arts", "Innovation", "Technology"];

export default function DiscoverPage() {
  const { allEvents, isLoading } = useEvents();
  const [fests, setFests] = useState<Fest[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    fetch(`${API_URL}/api/fests`)
      .then((r) => r.json())
      .then((d) => setFests(d.fests || d || []))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let items = [...allEvents];
    if (category !== "All") {
      items = items.filter(
        (e) => e.category?.toLowerCase() === category.toLowerCase()
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q) ||
          e.organizing_dept?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [allEvents, category, search]);

  const trending = useMemo(
    () =>
      [...allEvents]
        .filter((e) => new Date(e.event_date) >= new Date())
        .sort((a, b) => (b.total_participants || 0) - (a.total_participants || 0))
        .slice(0, 6),
    [allEvents]
  );

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="pb-4">
      {/* Search header */}
      <div className="px-4 pt-4 pb-2 sticky top-[var(--nav-height)] z-30 bg-[var(--color-bg)]">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search events, venues, departments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 pr-10 py-3 text-sm bg-white shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div className="px-4 pt-2 pb-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`chip transition-all whitespace-nowrap ${
                category === cat
                  ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                  : "bg-white text-[var(--color-text-muted)] border border-gray-200"
              }`}
              style={{ padding: "6px 14px", fontSize: "12px" }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Fests section */}
      {fests.length > 0 && !search && category === "All" && (
        <section className="px-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold flex items-center gap-1.5">
              <Sparkles size={16} className="text-[var(--color-accent)]" /> Fests
            </h2>
            <Link href="/fests" className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-0.5">
              See all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {fests.slice(0, 5).map((f) => (
              <div key={f.fest_id} className="min-w-[260px] max-w-[260px]">
                <FestCard fest={f} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trending */}
      {trending.length > 0 && !search && category === "All" && (
        <section className="px-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold flex items-center gap-1.5">
              🔥 Trending
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {trending.map((e) => (
              <div key={e.event_id} className="min-w-[240px] max-w-[240px]">
                <EventCard event={e} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All events grid */}
      <section className="px-4">
        <h2 className="text-base font-bold mb-3 flex items-center gap-1.5">
          <CalendarDays size={16} />
          {category === "All" ? "All Events" : category}
          <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">
            ({filtered.length})
          </span>
        </h2>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={28} />}
            title="No events found"
            subtitle={search ? `No results for "${search}"` : "Try a different category"}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
            {filtered.map((e) => (
              <EventCard key={e.event_id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
