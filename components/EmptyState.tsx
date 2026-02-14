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
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-up">
      <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="text-[15px] font-bold">{title}</p>
      {subtitle && (
        <p className="text-[13px] text-[var(--color-text-muted)] mt-1 max-w-[260px]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
