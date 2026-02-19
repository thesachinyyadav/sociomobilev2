"use client";

import { useState, useMemo } from "react";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { Search, X, CalendarDays, Filter, ArrowDownAZ, TrendingUp, Clock } from "lucide-react";
import { isDeadlinePassed } from "@/lib/dateUtils";

type SortKey = "date" | "popular" | "name";

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: "date", label: "Date", icon: <Clock size={11} /> },
  { key: "popular", label: "Popular", icon: <TrendingUp size={11} /> },
  { key: "name", label: "A-Z", icon: <ArrowDownAZ size={11} /> },
];

export default function EventsPage() {
  const { allEvents, isLoading } = useEvents();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [onlyOpen, setOnlyOpen] = useState(false);

  const events = useMemo(() => {
    let list = allEvents;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q) ||
          e.fest?.toLowerCase().includes(q)
      );
    }
    if (onlyOpen) {
      list = list.filter((e) => !isDeadlinePassed(e.registration_deadline));
    }
    const sorted = [...list];
    switch (sort) {
      case "date":
        sorted.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
        break;
      case "popular":
        sorted.sort((a, b) => (b.total_participants ?? 0) - (a.total_participants ?? 0));
        break;
      case "name":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return sorted;
  }, [allEvents, search, sort, onlyOpen]);

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top)+8px)]">
      {/* Header */}
      <div className="px-4 mb-3">
        <h1 className="text-lg font-extrabold">Events</h1>
        <p className="text-[12px] text-[var(--color-text-muted)]">
          {allEvents.length} events available
        </p>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-light)]" />
          <input
            type="text"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 pr-10"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-light)]">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="h-scroll px-4 mb-4 gap-2">
        <button
          onClick={() => setOnlyOpen(!onlyOpen)}
          className={`chip px-3 py-1.5 text-[12px] font-semibold border transition-colors ${
            onlyOpen
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-white text-[var(--color-text-muted)] border-[var(--color-border)]"
          }`}
        >
          <Filter size={11} /> {onlyOpen ? "Open only" : "All"}
        </button>
        {SORT_OPTIONS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`chip px-3 py-1.5 text-[12px] font-semibold border transition-colors ${
              sort === key
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                : "bg-white text-[var(--color-text-muted)] border-[var(--color-border)]"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="px-4 space-y-3">
          <Skeleton className="h-48 w-full rounded-[var(--radius)]" count={4} />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={28} className="text-[var(--color-primary)]" />}
          title="No events found"
          subtitle="Try a different search term"
        />
      ) : (
        <div className="px-4 space-y-3 stagger">
          {events.map((e) => (
            <EventCard key={e.event_id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
