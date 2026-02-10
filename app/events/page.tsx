"use client";

import { useState, useMemo } from "react";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/Skeleton";
import { Search, CalendarDays } from "lucide-react";

const CATEGORIES = ["All", "Academic", "Cultural", "Sports", "Literary", "Arts", "Innovation", "Free"];

export default function EventsPage() {
  const { allEvents, isLoading } = useEvents();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    let items = [...allEvents];
    if (category === "Free") {
      items = items.filter((e) => !e.registration_fee || e.registration_fee <= 0);
    } else if (category !== "All") {
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
          e.organizing_dept?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [allEvents, category, search]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 sticky top-[var(--nav-height)] z-30 bg-[var(--color-bg)]">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 pr-4 py-3 text-sm bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 pt-2 pb-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`chip transition-all ${
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

      {/* Grid */}
      <section className="px-4">
        <h2 className="text-base font-bold mb-3 flex items-center gap-1.5">
          <CalendarDays size={16} />
          {category === "All" ? "All Events" : category}
          <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">({filtered.length})</span>
        </h2>

        {filtered.length === 0 ? (
          <EmptyState icon={<Search size={28} />} title="No events found" subtitle="Try a different search or category" />
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
