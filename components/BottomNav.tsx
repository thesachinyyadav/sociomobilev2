"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, CalendarDays, User } from "lucide-react";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/events", icon: CalendarDays, label: "Events" },
  { href: "/profile", icon: User, label: "Profile" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--color-border)]"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div
        className="grid grid-cols-4"
        style={{ height: "var(--bottom-nav)" }}
      >
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 1.8}
                className="transition-all"
              />
              <span
                className={`text-[10px] leading-none ${
                  active ? "font-bold" : "font-medium"
                }`}
              >
                {label}
              </span>
              {active && (
                <span className="absolute bottom-[calc(var(--safe-bottom)+2px)] w-5 h-[3px] rounded-full bg-[var(--color-primary)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
