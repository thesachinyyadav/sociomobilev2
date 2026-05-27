"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { ArrowLeftIcon, UserIcon } from "@/components/icons";
import { useState, useEffect } from "react";

import dynamic from "next/dynamic";

const NetworkBanner = dynamic(() => import("@/components/NetworkBanner"), { ssr: false });

// Pages that show back button instead of logo
const BACK_PAGES = ["/event/", "/fest/", "/notifications", "/club/", "/profile/settings", "/privacy", "/terms"];

export default function TopBar() {
  const { user, userData, isAuthenticated, isAuthReady, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const showBack = BACK_PAGES.some((p) => pathname.startsWith(p));
  const isProfile = pathname === "/profile";
  const isImmersiveDetail = pathname.startsWith("/event/") || pathname.startsWith("/fest/");

  // Use user/isAuthenticated for login check, userData for profile enrichment
  const isUserLoggedIn = !!user || isAuthenticated;

  return (
    <>
      <header
        className={`sticky top-0 left-0 right-0 z-50 will-change-none transition-colors duration-200 ${
          isImmersiveDetail
            ? "bg-transparent text-[var(--color-text)]"
            : isProfile && userData
            ? "bg-[var(--color-primary-dark)] text-white"
            : "glass border-b border-[var(--color-border)] text-[var(--color-text)]"
        } ${showBack || isImmersiveDetail ? "border-none shadow-none" : ""} pt-safe`}
        style={{ backfaceVisibility: "hidden" }}
      >
        <div
          className="relative flex items-center px-3 gap-1.5 will-change-none"
          style={{ height: "var(--nav-height)" }}
        >
          {/* Left: Back button or profile/avatar */}
          {showBack ? (
            <button
              onClick={() => router.back()}
              className="back-btn"
              aria-label="Go back"
            >
                <ArrowLeftIcon size={17} strokeWidth={2.2} />
            </button>
          ) : !isHydrated || isLoading ? (
            <div className="w-[32px] h-[32px] rounded-full bg-gray-200/60 animate-pulse" />
          ) : isUserLoggedIn ? (
            <Link href="/profile" className="shrink-0">
              <div className="w-[32px] h-[32px] rounded-full overflow-hidden ring-2 ring-[#1a3a7a] shadow-[0_4px_14px_rgba(0,0,0,0.3)] bg-white/10 flex items-center justify-center">
                {userData?.avatar_url && !imgError ? (
                  <Image
                    src={userData.avatar_url}
                    alt={userData.name || "User"}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[12px] font-black text-white drop-shadow-sm">
                    {userData?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <Link href="/auth" className="flex items-center justify-center shrink-0 text-[var(--color-text-muted)] p-1">
              <UserIcon size={22} strokeWidth={1.5} />
            </Link>
          )}

          {!showBack && (
            <Link
              href="/"
              className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
              aria-label="Go to home"
            >
              <Image
                src="/logo.svg"
                alt="SOCIO"
                width={80}
                height={24}
                className={`h-[20px] w-auto ${isProfile ? "brightness-0 invert" : ""}`}
                priority
              />
            </Link>
          )}

          <div className="flex-1" />

          {/* Right actions */}
          {!isHydrated || isLoading ? (
            <div className="w-16 h-8 rounded-lg bg-gray-200/60 animate-pulse" />
          ) : isUserLoggedIn ? (
            <NotificationBell />
          ) : (
            <Link
              href="/auth"
              className="btn btn-primary btn-topbar-auth font-extrabold shadow-sm"
            >
              Sign in
            </Link>
          )}
        </div>
        
        {/* Attached Network Banner - Sticky to header */}
        <div className="absolute top-full left-0 right-0">
          <NetworkBanner />
        </div>
      </header>
    </>
  );
}
