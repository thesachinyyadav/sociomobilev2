"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, CalendarDays, User, Bell } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/events", icon: CalendarDays, label: "Events" },
  { href: "/notifications", icon: Bell, label: "Alerts" },
  { href: "/profile", icon: User, label: "Profile" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

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
        className="grid grid-cols-5"
        style={{ height: "var(--bottom-nav)" }}
      >
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          const showBadge = href === "/notifications" && unreadCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-0.5 transition-all duration-200 rounded-[var(--radius-sm)] mx-1 my-1 ${
                active
                  ? "text-[var(--color-primary)] bg-[var(--color-primary-light)]"
                  : "text-[var(--color-text-light)]"
              }`}
            >
              <div className={`relative transition-transform duration-200 ${active ? "scale-110" : ""}`}>
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 1.6}
                />
                {showBadge && (
                  <span className="badge-count">{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
              </div>
              <span
                className={`text-[10px] leading-none transition-all ${
                  active ? "font-bold" : "font-medium"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
