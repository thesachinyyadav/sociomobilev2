"use client";

import { useState, useMemo } from "react";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { Search, X, CalendarDays, Filter, ArrowDownAZ, TrendingUp, Clock } from "lucide-react";
import { isDeadlinePassed } from "@/lib/dateUtils";
import { useDebounce } from "@/lib/useDebounce";

type SortKey = "date" | "popular" | "name";

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: "date", label: "Date", icon: <Clock size={11} /> },
  { key: "popular", label: "Popular", icon: <TrendingUp size={11} /> },
  { key: "name", label: "A-Z", icon: <ArrowDownAZ size={11} /> },
];

const ITEMS_PER_PAGE = 8;

export default function EventsPage() {
  const { allEvents, isLoading } = useEvents();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [sort, setSort] = useState<SortKey>("date");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const allFilteredEvents = useMemo(() => {
    let list = allEvents;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (e) =>
          String(e.title || "").toLowerCase().includes(q) ||
          String(e.venue || "").toLowerCase().includes(q) ||
          String(e.fest || "").toLowerCase().includes(q)
      );
    }
    if (onlyOpen) {
      list = list.filter((e) => !isDeadlinePassed(e.registration_deadline));
    }
    const sorted = [...list];
    switch (sort) {
      case "date":
        sorted.sort((a, b) => {
          const aClosed = isDeadlinePassed(a.registration_deadline);
          const bClosed = isDeadlinePassed(b.registration_deadline);
          if (aClosed !== bClosed) return aClosed ? 1 : -1;
          return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        });
        break;
      case "popular":
        sorted.sort((a, b) => {
          const aClosed = isDeadlinePassed(a.registration_deadline);
          const bClosed = isDeadlinePassed(b.registration_deadline);
          if (aClosed !== bClosed) return aClosed ? 1 : -1;
          return (b.total_participants ?? 0) - (a.total_participants ?? 0);
        });
        break;
      case "name":
        sorted.sort((a, b) => {
          const aClosed = isDeadlinePassed(a.registration_deadline);
          const bClosed = isDeadlinePassed(b.registration_deadline);
          if (aClosed !== bClosed) return aClosed ? 1 : -1;
          return String(a.title || "").localeCompare(String(b.title || ""));
        });
        break;
    }
    return sorted;
  }, [allEvents, debouncedSearch, sort, onlyOpen]);

  const totalPages = Math.ceil(allFilteredEvents.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const events = allFilteredEvents.slice(0, startIdx + ITEMS_PER_PAGE);
  const happeningSoonEvents = events.slice(0, 2);
  const trendingEvents = events.slice(2);
  const hasMore = currentPage < totalPages;

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top)+8px)]">
      {/* Header */}
      <div className="px-5 mb-4">
        <h1 className="text-lg font-extrabold">Events</h1>
      </div>

      {/* Search */}
      <div className="px-5 mb-5">
        <div className="relative group min-w-0">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-light)] group-focus-within:text-[var(--color-primary)] transition-colors pointer-events-none z-[1]" />
          <input
            type="text"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[44px] pl-[42px] pr-10 text-[14px] bg-white border-[1.5px] border-[var(--color-border)] rounded-[var(--radius)] outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(21,76,179,0.1)] transition-all placeholder:text-[var(--color-text-muted)]"
          />
          {search && (
            <button 
              onClick={() => setSearch("")} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-light)] hover:text-[var(--color-text)] transition-colors p-1.5 rounded-full hover:bg-black/5 z-[1]"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="h-scroll mb-4 gap-2">
        <div className="shrink-0 w-5" aria-hidden />
        <button
          onClick={() => {
            setOnlyOpen(!onlyOpen);
            setCurrentPage(1);
          }}
          className={`chip btn-active-state px-3 py-1.5 text-[12px] font-semibold border transition-colors ${
            onlyOpen
              ? "chip-active border-[var(--color-primary)] shadow-[var(--shadow-primary)]"
              : "bg-white text-[var(--color-text-muted)] border-[var(--color-border)]"
          }`}
        >
          <Filter size={11} /> {onlyOpen ? "Open only" : "All"}
        </button>
        {SORT_OPTIONS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => {
              setSort(key);
              setCurrentPage(1);
            }}
            className={`chip btn-active-state px-3 py-1.5 text-[12px] font-semibold border transition-colors ${
              sort === key
                ? "chip-active border-[var(--color-primary)] shadow-[var(--shadow-primary)]"
                : "bg-white text-[var(--color-text-muted)] border-[var(--color-border)]"
            }`}
          >
            {icon} {label}
          </button>
        ))}
        <div className="shrink-0 w-5" aria-hidden />
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
        <>
          <div className="px-4 space-y-6">
            {happeningSoonEvents.length > 0 && (
              <section className="space-y-3 animate-fade-up">
                <h2 className="text-[22px] font-extrabold tracking-tight">Happening Soon</h2>

                <div className="-mx-4 px-4">
                  <div className="h-scroll gap-3 snap-x snap-mandatory">
                    <div className="shrink-0 w-px" aria-hidden />
                    {happeningSoonEvents.map((event) => (
                      <div key={event.event_id} className="w-[calc(100vw-40px)] max-w-[420px] shrink-0 snap-start">
                        <EventCard event={event} featured showAction />
                      </div>
                    ))}
                    <div className="shrink-0 w-px" aria-hidden />
                  </div>
                </div>
              </section>
            )}

            {trendingEvents.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[22px] font-extrabold tracking-tight">Trending Events</h2>
                <div className="space-y-3 stagger">
                  {trendingEvents.map((e) => (
                    <EventCard key={e.event_id} event={e} showAction />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Pagination info and load more button */}
          {allFilteredEvents.length > ITEMS_PER_PAGE && (
            <div className="px-4 py-4 flex items-center justify-between">
              <p className="text-[12px] text-[var(--color-text-muted)] font-semibold">
                Showing {Math.min(startIdx + ITEMS_PER_PAGE, allFilteredEvents.length)} of {allFilteredEvents.length}
              </p>
              {hasMore && (
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="btn btn-primary btn-active-state text-[12px] px-4 py-1.5"
                >
                  Load More
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
