"use client";

import { WifiOff } from "lucide-react";

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-up">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-[var(--color-text-muted)]">
        {icon || <WifiOff size={28} />}
      </div>
      <h3 className="text-lg font-bold text-[var(--color-text)] mb-1">{title}</h3>
      {subtitle && (
        <p className="text-sm text-[var(--color-text-muted)] max-w-xs">{subtitle}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
