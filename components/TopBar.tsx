"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { ArrowLeft } from "lucide-react";

// Pages that show back button instead of logo
const BACK_PAGES = ["/event/", "/fest/", "/club/", "/notifications", "/edit/", "/create/", "/manage/"];

export default function TopBar() {
  const { userData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const showBack = BACK_PAGES.some((p) => pathname.startsWith(p));

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--color-border)]"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div
        className="flex items-center px-3 gap-2"
        style={{ height: "var(--nav-height)" }}
      >
        {/* Left: Back button or Logo */}
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="back-btn"
            aria-label="Go back"
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
        ) : (
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <Image
              src="/logo.svg"
              alt="Socio"
              width={30}
              height={30}
              priority
            />
          </Link>
        )}

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
                className="rounded-full ring-2 ring-[var(--color-primary)]/15"
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
