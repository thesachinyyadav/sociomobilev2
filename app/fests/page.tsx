"use client";

import { useState, useEffect } from "react";
import { FestCard } from "@/components/FestCard";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/Skeleton";
import type { Fest } from "@/context/EventContext";
import { Search, Sparkles } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const CATEGORIES = ["All", "Technology", "Cultural", "Science", "Arts", "Management", "Academic", "Sports"];

export default function FestsPage() {
  const [fests, setFests] = useState<Fest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    fetch(`${API_URL}/api/fests`)
      .then((r) => r.json())
      .then((d) => setFests(d.fests || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  const filtered = fests.filter((f) => {
    if (category !== "All" && f.category?.toLowerCase() !== category.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !f.fest_title.toLowerCase().includes(q) &&
        !f.organizing_dept?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-2 sticky top-[var(--nav-height)] z-30 bg-[var(--color-bg)]">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search fests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 pr-4 py-3 text-sm bg-white shadow-sm"
          />
        </div>
      </div>

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

      <section className="px-4">
        <h2 className="text-base font-bold mb-3 flex items-center gap-1.5">
          <Sparkles size={16} className="text-[var(--color-accent)]" />
          {category === "All" ? "All Fests" : category}
          <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">({filtered.length})</span>
        </h2>
        {filtered.length === 0 ? (
          <EmptyState icon={<Sparkles size={28} />} title="No fests found" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
            {filtered.map((f) => (
              <FestCard key={f.fest_id} fest={f} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
