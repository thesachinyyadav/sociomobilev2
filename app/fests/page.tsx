"use client";

import { useState, useEffect } from "react";
import FestCard from "@/components/FestCard";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { Search, X, PartyPopper } from "lucide-react";
import type { Fest } from "@/context/EventContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function FestsPage() {
  const [fests, setFests] = useState<Fest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/fests`);
        if (res.ok) {
          const data = await res.json();
          setFests(data.fests ?? data ?? []);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = search
    ? fests.filter(
        (f) =>
          (f.fest_title || f.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (f.organizing_dept || f.department || "").toLowerCase().includes(search.toLowerCase())
      )
    : fests;

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top)+8px)]">
      {/* Header */}
      <div className="px-4 mb-3">
        <h1 className="text-lg font-extrabold">Fests</h1>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Campus festivals & mega events
        </p>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-light)]" />
          <input
            type="text"
            placeholder="Search fests…"
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

      {/* List */}
      {loading ? (
        <div className="px-4 space-y-3">
          <Skeleton className="h-44 w-full rounded-[var(--radius)]" count={3} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<PartyPopper size={28} className="text-[var(--color-primary)]" />}
          title="No fests found"
          subtitle={search ? "Try a different search" : "Check back soon for upcoming fests"}
        />
      ) : (
        <div className="px-4 space-y-3 stagger">
          {filtered.map((f) => (
            <FestCard key={f.fest_id || f.id} fest={f} />
          ))}
        </div>
      )}
    </div>
  );
}
