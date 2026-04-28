"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import FestCard from "@/components/FestCard";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { SearchIcon, XIcon, ArrowRightIcon, CalendarIcon, MapPinIcon, SparklesIcon, UsersIcon, ClockIcon, FlameIcon, TrendingUpIcon } from "@/components/icons";
import { FilterChip } from "@/components/FilterChip";
import { Button } from "@/components/Button";
import { SectionContainer } from "@/components/SectionContainer";
import { formatDateShort, isDeadlinePassed } from "@/lib/dateUtils";
import type { Fest } from "@/context/EventContext";
import { useDebounce } from "@/lib/useDebounce";

const ITEMS_PER_PAGE = 10;
const QUICK_CATEGORY_LIMIT = 6;
const GRID_CATEGORY_LIMIT = 4;

function normalizeFestLabel(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function formatCompactCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count >= 1_000_000) {
    const value = count / 1_000_000;
    return `${parseFloat(value.toFixed(value >= 10 ? 0 : 1))}m`;
  }
  if (count >= 1_000) {
    const value = count / 1_000;
    return `${parseFloat(value.toFixed(value >= 10 ? 0 : 1))}k`;
  }
  return `${Math.round(count)}`;
}

export default function DiscoverPage() {
  const { allEvents, isLoading } = useEvents();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [showOpen, setShowOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [fests, setFests] = useState<Fest[]>([]);
  const [festsLoading, setFestsLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  /* Fetch actual fests from API so we get proper fest_id/slug */
  useEffect(() => {
    (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch("/api/pwa/fests", { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const arr = data.fests ?? data.data ?? data ?? [];
          setFests(Array.isArray(arr) ? arr : []);
        }
      } catch {}
      finally {
        clearTimeout(timeoutId);
        setFestsLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const values = new Set<string>(["All"]);
    if (allEvents.some((event) => !event.registration_fee || event.registration_fee === 0)) {
      values.add("Free");
    }
    allEvents.forEach((event) => {
      const category = event.category?.trim();
      if (category) values.add(category);
    });
    return Array.from(values).slice(0, QUICK_CATEGORY_LIMIT);
  }, [allEvents]);

  const categoryGrid = useMemo(
    () => categories.filter((category) => category !== "All").slice(0, GRID_CATEGORY_LIMIT),
    [categories]
  );

  const festRegistrationMap = useMemo(() => {
    const map = new Map<string, number>();
    allEvents.forEach((event) => {
      const key = normalizeFestLabel(event.fest);
      if (!key || key === "none") return;
      const count = Math.max(0, event.total_participants ?? 0);
      map.set(key, (map.get(key) ?? 0) + count);
    });
    return map;
  }, [allEvents]);

  const trendingFests = useMemo(() => {
    return [...fests]
      .map((fest) => {
        const title = fest.fest_title || fest.name || "";
        const key = normalizeFestLabel(title);
        const registrations = key ? festRegistrationMap.get(key) ?? 0 : 0;
        return { fest, registrations };
      })
      .sort((a, b) => {
        if (b.registrations !== a.registrations) return b.registrations - a.registrations;
        const aTitle = a.fest.fest_title || a.fest.name || "";
        const bTitle = b.fest.fest_title || b.fest.name || "";
        return aTitle.localeCompare(bTitle);
      })
      .slice(0, 6);
  }, [fests, festRegistrationMap]);

  /* Filter events based on search and open status */
  const filtered = useMemo(() => {
    let list = allEvents;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (e) =>
          String(e.title || "").toLowerCase().includes(q) ||
          String(e.venue || "").toLowerCase().includes(q) ||
          String(e.fest || "").toLowerCase().includes(q) ||
          String(e.category || "").toLowerCase().includes(q)
      );
    }
    
    // Apply new filter chips
    if (activeCategory === "Today") {
      const today = new Date().toDateString();
      list = list.filter(e => new Date(e.event_date).toDateString() === today);
    } else if (activeCategory === "This Week") {
      const today = new Date();
      today.setHours(0,0,0,0);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      list = list.filter(e => {
        const d = new Date(e.event_date);
        return d >= today && d <= nextWeek;
      });
    } else if (activeCategory === "Free") {
      list = list.filter(e => !e.registration_fee || e.registration_fee === 0);
    } else if (activeCategory !== "All") {
      list = list.filter(e => e.category?.trim().toLowerCase() === activeCategory.toLowerCase());
    }

    if (showOpen) {
      list = list.filter((e) => !isDeadlinePassed(e.registration_deadline));
    }
    return list.sort((a, b) => {
      const aClosed = isDeadlinePassed(a.registration_deadline);
      const bClosed = isDeadlinePassed(b.registration_deadline);
      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
    });
  }, [allEvents, debouncedSearch, activeCategory, showOpen]);

  const allFiltered = filtered;
  const spotlightEvents = allFiltered.slice(0, 4);
  const totalPages = Math.ceil(allFiltered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedEvents = allFiltered.slice(0, startIdx + ITEMS_PER_PAGE);

  /* Auto-scroll for Featured Fests */
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUserInteraction = useCallback(() => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
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
  }, [trendingFests]);

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top)+4px)] pb-8 bg-[#f9fafb] max-w-[420px] mx-auto">
      {/* Search & Header Row */}
      <div className="px-5 pt-2 pb-4 h-[60px] flex flex-col justify-center">
        {!isSearchOpen ? (
          <div className="flex items-center justify-between animate-fade-in">
            <h1 className="text-[26px] font-black tracking-tight text-[var(--color-text)]">Discover</h1>
          </div>
        ) : (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="relative group flex-1 min-w-0">
              <SearchIcon
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none z-[1]"
              />
              <input
                autoFocus
                type="text"
                placeholder="Search events, clubs, or workshops..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-[46px] pl-[44px] pr-10 text-[14px] bg-[#e8e9ec] border-none rounded-xl outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] font-medium"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1.5 rounded-full hover:bg-black/5 z-[1]"
                  aria-label="Clear search"
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearch("");
                setCurrentPage(1);
              }}
              className="text-[13px] font-bold text-[var(--color-primary-dark)] px-1 shrink-0"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div className="h-scroll mb-6 gap-2.5 items-center">
        <div className="shrink-0 w-4" aria-hidden />
        {!isSearchOpen && (
          <button
            onClick={() => setIsSearchOpen(true)}
            className="shrink-0 w-9 h-9 rounded-full bg-[#e8e9ec] flex items-center justify-center text-[var(--color-text)] transition-transform active:scale-95 hover:bg-[#d1d3d8] mr-1"
            aria-label="Open search"
          >
            <SearchIcon size={17} strokeWidth={2.5} />
          </button>
        )}
        {["All", "Today", "This Week", "Free"].map((filter) => {
          const active = filter === activeCategory;
          return (
            <FilterChip
              key={filter}
              label={filter}
              isActive={active}
              onClick={() => {
                setActiveCategory(filter);
                setCurrentPage(1);
              }}
            />
          );
        })}
        <div className="shrink-0 w-4" aria-hidden />
      </div>

      {isLoading ? (
        <div className="px-5 space-y-4">
          <Skeleton className="h-52 w-full rounded-[var(--radius-xl)]" count={1} />
          <Skeleton className="h-36 w-full rounded-[var(--radius-lg)]" count={2} />
        </div>
      ) : (
        <>
          {/* Spotlight Hero Card */}
          {spotlightEvents.length > 0 && (
            <SectionContainer title="Spotlight" actionLabel="See All" actionHref="/events">
              <EventCard event={spotlightEvents[0]} tier="hero" />
            </SectionContainer>
          )}

          {/* Trending Fests - Horizontal Scroll */}
          {(festsLoading || fests.length > 0) && (
            <div className="pb-8">
              <div className="px-5 pb-3 flex items-center justify-between">
                <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Trending Now</h2>
                <Link href="/fests" className="text-[12px] font-bold text-[var(--color-primary-dark)] hover:underline">
                  View All
                </Link>
              </div>
              <div
                ref={scrollRef}
                onTouchStart={handleUserInteraction}
                onMouseDown={handleUserInteraction}
                className="flex overflow-x-auto gap-3.5 snap-x snap-mandatory scroll-smooth pb-1 no-scrollbar"
              >
                {/* left spacer */}
                <div className="shrink-0 w-5" aria-hidden />
                {festsLoading
                  ? Array.from({ length: 2 }).map((_, idx) => (
                      <div
                        key={`fest-skeleton-${idx}`}
                        className="card-elevated w-[calc(100vw-40px)] max-w-[380px] shrink-0 snap-center"
                      >
                        <div className="skeleton aspect-[16/10]" />
                        <div className="p-4 space-y-2">
                          <div className="skeleton h-4 w-3/4" />
                          <div className="skeleton h-3 w-2/3" />
                          <div className="skeleton h-9 w-28 rounded-[var(--radius)]" />
                        </div>
                      </div>
                    ))
                  : trendingFests.map(({ fest: f, registrations }) => {
                      const img = f.fest_image_url || f.banner_url || f.image_url;
                      const title = f.fest_title || f.name || "Fest";
                      return (
                        <div
                          key={f.fest_id || f.id}
                          className="w-[calc(100vw-40px)] max-w-[380px] shrink-0 snap-center"
                        >
                          <FestCard fest={{ ...f, registrations } as any} tier="elevated" isTrending />
                        </div>
                      );
                    })}
                {/* right spacer */}
                <div className="shrink-0 w-5" aria-hidden />
              </div>
            </div>
          )}

          {/* Browse by Vibe (Asymmetric Grid) */}
          {categoryGrid.length > 0 && (
            <SectionContainer title="Browse by Vibe" actionLabel="View All" actionHref="/events">
              <div className="grid grid-cols-2 gap-3">
                {/* Full Width Card */}
                {categoryGrid[0] && (
                  <button
                    onClick={() => { setActiveCategory(categoryGrid[0]); setCurrentPage(1); }}
                    className="col-span-2 relative bg-[#eef0ff] rounded-[18px] p-5 overflow-hidden text-left border border-transparent hover:border-[#d0d6ff] transition-all duration-150 active:scale-[0.97] will-change-transform min-h-[110px] flex flex-col justify-center"
                  >
                    <div className="relative z-10">
                      <div className="w-8 h-8 rounded-full bg-[#3b5bdb] text-white flex items-center justify-center mb-2 shadow-sm">
                        <SparklesIcon size={16} />
                      </div>
                      <h3 className="text-[18px] font-black text-[#263161] leading-tight mb-1">{categoryGrid[0]}</h3>
                      <p className="text-[12px] text-[#55629c] font-medium">Explore the best</p>
                    </div>
                    {/* Decorative abstract shape */}
                    <div className="absolute right-[-10%] bottom-[-20%] text-[#d0d6ff] opacity-50 rotate-[-15deg]">
                      <SparklesIcon size={120} strokeWidth={1} />
                    </div>
                  </button>
                )}
                
                {/* Half Width Cards */}
                {categoryGrid[1] && (
                  <button
                    onClick={() => { setActiveCategory(categoryGrid[1]); setCurrentPage(1); }}
                    className="col-span-1 relative bg-[#fff4cf] rounded-[18px] p-5 overflow-hidden text-left border border-transparent hover:border-[#ffe18a] transition-all duration-150 active:scale-[0.97] will-change-transform min-h-[110px] flex flex-col justify-between"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#f59e0b] text-white flex items-center justify-center shadow-sm">
                      <UsersIcon size={14} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-black text-[#745b00] leading-tight mb-0.5">{categoryGrid[1]}</h3>
                      <p className="text-[11px] text-[#a18627] font-medium">12 Active</p>
                    </div>
                  </button>
                )}
                
                {categoryGrid[2] && (
                  <button
                    onClick={() => { setActiveCategory(categoryGrid[2]); setCurrentPage(1); }}
                    className="col-span-1 relative bg-[#f1edfc] rounded-[18px] p-5 overflow-hidden text-left border border-transparent hover:border-[#dbcefc] transition-all duration-150 active:scale-[0.97] will-change-transform min-h-[110px] flex flex-col justify-between"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shadow-sm">
                      <CalendarIcon size={14} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-black text-[#3d1880] leading-tight mb-0.5">{categoryGrid[2]}</h3>
                      <p className="text-[11px] text-[#6b4ab0] font-medium">45 Active</p>
                    </div>
                  </button>
                )}
              </div>
            </SectionContainer>
          )}

          {/* Events Section - Vertical List */}
          {allFiltered.length > 0 && (
            <SectionContainer title="Curated For You">
              {/* Personalization Signal */}
              <div className="mb-4">
                <p className="text-[12px] font-bold text-[var(--color-primary)] flex items-center gap-1.5 bg-[var(--color-primary-light)] w-max px-2.5 py-1 rounded-full shadow-sm">
                  <SparklesIcon size={12} />
                  {activeCategory === "All" || activeCategory === "Free" || activeCategory === "Today" || activeCategory === "This Week" 
                    ? "Recommended based on your activity" 
                    : `Because you are interested in ${activeCategory}`}
                </p>
              </div>
              <div className="space-y-4">
                {displayedEvents.map((e) => (
                  <EventCard key={e.event_id} event={e} tier="standard" />
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </SectionContainer>
          )}

          {/* Empty state */}
          {allFiltered.length === 0 && (
            <div className="px-5 py-12">
              <EmptyState
                icon={<SearchIcon size={32} className="text-[var(--color-primary)]" />}
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

