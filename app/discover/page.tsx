"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { Search, X, Filter, ArrowRight } from "lucide-react";
import { isDeadlinePassed } from "@/lib/dateUtils";
import Image from "next/image";
import type { Fest } from "@/context/EventContext";

const ITEMS_PER_PAGE = 10;

export default function DiscoverPage() {
  const { allEvents, isLoading } = useEvents();
  const [search, setSearch] = useState("");
  const [showOpen, setShowOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [fests, setFests] = useState<Fest[]>([]);
  const [festsLoading, setFestsLoading] = useState(true);

  /* Fetch actual fests from API so we get proper fest_id/slug */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/pwa/fests");
        if (res.ok) {
          const data = await res.json();
          const arr = data.fests ?? data ?? [];
          setFests(Array.isArray(arr) ? arr : []);
        }
      } catch {}
      setFestsLoading(false);
    })();
  }, []);

  /* Filter events based on search and open status */
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
    if (showOpen) {
      list = list.filter((e) => !isDeadlinePassed(e.registration_deadline));
    }
    return list.sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [allEvents, search, showOpen]);

  const allFiltered = filtered;
  const totalPages = Math.ceil(allFiltered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedEvents = allFiltered.slice(0, startIdx + ITEMS_PER_PAGE);
  const hasMore = currentPage < totalPages;

  /* Auto-scroll for Featured Fests */
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  const handleUserInteraction = useCallback(() => {
    pausedRef.current = true;
    const timer = setTimeout(() => { pausedRef.current = false; }, 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      if (el.scrollLeft >= maxScroll - 2) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const card = el.querySelector<HTMLElement>("[data-fest-card]");
        const step = card ? card.offsetWidth + 12 : el.clientWidth;
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    }, 3000);
    return () => clearInterval(id);
  }, [fests]);

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top)+4px)] pb-8">
      {/* Header */}
      <div className="px-5 pt-3 pb-2">
        <h1 className="text-[22px] font-extrabold">Discover Events &amp; Fests</h1>
      </div>

      {/* Search + Filter row */}
      <div className="px-5 pb-4 flex items-center gap-2.5">
        <div className="relative group flex-1 min-w-0">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-light)] group-focus-within:text-[var(--color-primary)] transition-colors pointer-events-none z-[1]"
          />
          <input
            type="text"
            placeholder="Search events, fests, venues…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[44px] text-[14px] bg-white border-[1.5px] border-[var(--color-border)] rounded-[var(--radius)] outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(21,76,179,0.1)] transition-all placeholder:text-[var(--color-text-muted)]"
            style={{ paddingLeft: 42, paddingRight: 40 }}
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-light)] hover:text-[var(--color-text)] transition-colors p-1.5 rounded-full hover:bg-black/5 z-[1]"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setShowOpen(!showOpen);
            setCurrentPage(1);
          }}
          className={`shrink-0 flex items-center justify-center gap-1.5 h-[44px] px-4 border text-[12px] font-bold rounded-[var(--radius)] transition-all ${
            showOpen
              ? "bg-[#dcfce7] text-[#166534] border-[#86efac]"
              : "bg-white text-[var(--color-text-muted)] border-[var(--color-border)]"
          }`}
        >
          <Filter size={14} />
          {showOpen ? "Open" : "All"}
        </button>
      </div>

      {isLoading ? (
        <div className="px-5 space-y-4">
          <Skeleton className="h-32 w-full rounded-[var(--radius-lg)]" count={2} />
        </div>
      ) : (
        <>
          {/* Fests Section - Horizontal Scroll */}
          {fests.length > 0 && (
            <div className="pb-6">
              <div className="px-5 pb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold">Featured Fests</h2>
                <Link href="/fests" className="text-[12px] font-bold text-[var(--color-primary)] flex items-center gap-1 hover:gap-2 transition-all">
                  View More <ArrowRight size={13} />
                </Link>
              </div>
              <div
                ref={scrollRef}
                onTouchStart={handleUserInteraction}
                onMouseDown={handleUserInteraction}
                className="flex overflow-x-auto gap-3 snap-x snap-mandatory scroll-smooth pb-1 no-scrollbar"
                style={{ scrollbarWidth: "none" }}
              >
                {/* left spacer */}
                <div className="shrink-0 w-5" aria-hidden />
                {fests.slice(0, 6).map((f) => {
                  const img = f.fest_image_url || f.banner_url || f.image_url;
                  const title = f.fest_title || f.name || "Fest";
                  return (
                    <Link
                      key={f.fest_id || f.id}
                      href={`/fest/${f.slug || f.fest_id}`}
                      data-fest-card
                      className="flex-shrink-0 snap-center rounded-[var(--radius)] bg-white shadow-[var(--shadow-card)] overflow-hidden hover:shadow-lg transition-shadow active:scale-[0.98]"
                      style={{ width: "calc(100vw - 56px)" }}
                    >
                      <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
                        {img ? (
                          <Image
                            src={img}
                            alt={title}
                            fill
                            className="object-cover"
                            sizes="(max-width:480px) 90vw, 400px"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[#1a6bdb] flex items-center justify-center">
                            <span className="text-white font-extrabold text-lg">{title.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-[13px] font-bold line-clamp-1">{title}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                          {f.organizing_dept || f.department || ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
                {/* right spacer */}
                <div className="shrink-0 w-5" aria-hidden />
              </div>
            </div>
          )}

          {/* Events Section - Vertical List */}
          {allFiltered.length > 0 && (
            <div>
              <div className="px-5 pb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold">All Events</h2>
                <Link href="/events" className="text-[12px] font-bold text-[var(--color-primary)] flex items-center gap-1 hover:gap-2 transition-all">
                  View More <ArrowRight size={13} />
                </Link>
              </div>
              <div className="px-5 space-y-3">
                {displayedEvents.map((e) => (
                  <EventCard key={e.event_id} event={e} />
                ))}
              </div>

              {/* Beautiful Pagination */}
              {totalPages > 1 && (
                <div className="px-5 mt-6 flex flex-col items-center gap-4">
                  {/* Page indicator */}
                  <p className="text-[12px] text-[var(--color-text-muted)] font-semibold">
                    Page <span className="text-[var(--color-primary)] font-bold">{currentPage}</span> of <span className="text-[var(--color-primary)] font-bold">{totalPages}</span>
                  </p>

                  {/* Page dots */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const pageNum = i + 1;
                      const isCurrentPage = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`transition-all ${
                            isCurrentPage
                              ? "w-8 h-2 rounded-full bg-[var(--color-primary)]"
                              : "w-2 h-2 rounded-full bg-[var(--color-border)] hover:bg-[var(--color-text-light)]"
                          }`}
                          aria-label={`Go to page ${pageNum}`}
                        />
                      );
                    })}
                    {totalPages > 5 && <span className="text-[var(--color-text-muted)] text-[11px] ml-1">•••</span>}
                  </div>

                  {/* Next/Prev buttons */}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-[12px] font-bold text-[var(--color-primary)] border border-[var(--color-primary)] rounded-[var(--radius-lg)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 active:scale-95 transition-all"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-[12px] font-bold text-white bg-[var(--color-primary)] rounded-[var(--radius-lg)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-primary-dark)] active:scale-95 transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {allFiltered.length === 0 && (
            <div className="px-5 py-12">
              <EmptyState
                icon={<Search size={32} className="text-[var(--color-primary)]" />}
                title="No events found"
                subtitle="Try adjusting your search or filters to see more results"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

