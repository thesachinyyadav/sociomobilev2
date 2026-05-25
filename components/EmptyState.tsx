import type { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center animate-fade-up">
      <div className="w-12 h-12 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mb-2.5">
        {icon}
      </div>
      <p className="text-[13px] font-bold">{title}</p>
      {subtitle && (
        <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 max-w-[240px]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
