"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, CalendarDays, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const HIDE_ON = ["/auth", "/auth/callback"];

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  match: (p: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    match: (p) => p === "/",
  },
  {
    href: "/discover",
    label: "Discover",
    icon: Search,
    match: (p) => p.startsWith("/discover"),
  },
  {
    href: "/events",
    label: "Events",
    icon: CalendarDays,
    match: (p) => p.startsWith("/events") || p.startsWith("/event/"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    match: (p) => p.startsWith("/profile"),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { session } = useAuth();

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/30"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="flex items-center justify-around h-[var(--bottom-nav)]">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;

          // If profile and not logged in, link to auth
          const href =
            item.href === "/profile" && !session ? "/auth" : item.href;

          return (
            <Link
              key={item.href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-xl transition-all ${
                active
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  active ? "bg-[var(--color-primary)]/10 scale-110" : ""
                }`}
              >
                <Icon
                  size={22}
                  className={
                    active ? "stroke-[2.5]" : "stroke-[1.8] opacity-70"
                  }
                />
              </div>
              <span
                className={`text-[10px] font-semibold leading-none ${
                  active ? "" : "opacity-60"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
