import React from "react";
import Link from "next/link";
import { ArrowRightIcon } from "./icons";

export interface SectionContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  children: React.ReactNode;
}

export function SectionContainer({
  title,
  actionLabel,
  actionHref,
  children,
  className = "",
  style,
  ...props
}: SectionContainerProps) {
  return (
    <div className={`px-4 pb-4 ${className}`} style={style} {...props}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-extrabold tracking-[-0.02em] text-[#1a1c1c]">{title}</h2>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="text-[11px] font-bold text-[var(--color-primary-dark)] flex items-center gap-1 hover:underline transition-all active:scale-95"
          >
            {actionLabel} <ArrowRightIcon size={12} className="opacity-80" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
