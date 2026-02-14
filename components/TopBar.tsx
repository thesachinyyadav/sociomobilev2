"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/NotificationBell";

export default function TopBar() {
  const { userData } = useAuth();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--color-border)]"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div
        className="flex items-center px-4 gap-3"
        style={{ height: "var(--nav-height)" }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo.svg"
            alt="Socio"
            width={28}
            height={28}
            priority
          />
          <span className="text-base font-extrabold tracking-tight text-gradient">
            SOCIO
          </span>
        </Link>

        <div className="flex-1" />

        {/* Right actions */}
        {userData && <NotificationBell />}

        {userData ? (
          <Link href="/profile" className="shrink-0">
            {userData.avatar_url ? (
              <Image
                src={userData.avatar_url}
                alt={userData.name}
                width={32}
                height={32}
                className="rounded-full ring-2 ring-[var(--color-primary)]/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">
                {userData.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </Link>
        ) : (
          <Link
            href="/auth"
            className="btn btn-primary btn-sm text-[12px] py-1.5 px-3"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
