"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar } from "lucide-react";
import type { Fest } from "@/context/EventContext";
import { formatDateRange } from "@/lib/dateUtils";

export default function FestCard({ fest }: { fest: Fest }) {
  const href = `/fest/${fest.slug || fest.fest_id}`;
  const img = fest.fest_image_url || fest.banner_url || fest.image_url;
  const title = fest.fest_title || fest.name || "Fest";
  const dept = fest.organizing_dept || fest.department;

  return (
    <Link href={href} className="card block animate-fade-up group">
      {/* Image */}
      <div className="relative aspect-[2/1] bg-gray-100 overflow-hidden">
        {img ? (
          <Image
            src={img}
            alt={title}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
            sizes="(max-width:480px) 100vw, 50vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[#1a6bdb] flex items-center justify-center">
            <span className="text-white text-4xl font-black opacity-40">
              {title.charAt(0)}
            </span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        {/* Title on image */}
        <div className="absolute bottom-0 left-0 right-0 p-3.5">
          <h3 className="text-white text-[15px] font-extrabold leading-tight line-clamp-2 drop-shadow">
            {title}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-1">
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)]">
          <Calendar size={12} />
          {formatDateRange(
            fest.opening_date || fest.start_date,
            fest.closing_date || fest.end_date
          )}
        </div>
        {dept && (
          <p className="text-[11px] font-semibold text-[var(--color-primary)]">{dept}</p>
        )}
        {fest.category && (
          <span className="chip bg-[var(--color-primary-light)] text-[var(--color-primary)] text-[10px]">
            {fest.category}
          </span>
        )}
      </div>
    </Link>
  );
}
