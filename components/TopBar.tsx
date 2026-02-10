"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

const HIDE_ON = ["/auth", "/auth/callback"];

export function TopBar() {
  const { userData, isLoading } = useAuth();
  const pathname = usePathname();

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/20">
      <div className="flex items-center justify-between px-4 h-[var(--nav-height)]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo.svg"
            alt="SOCIO"
            width={90}
            height={28}
            priority
            className="h-6 w-auto"
          />
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-8 h-8 rounded-full skeleton" />
          ) : userData ? (
            <Link href="/profile" className="flex items-center gap-2">
              {userData.avatar_url ? (
                <img
                  src={userData.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full ring-2 ring-[var(--color-primary)]/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold">
                  {(userData.name || "U")[0].toUpperCase()}
                </div>
              )}
            </Link>
          ) : (
            <Link
              href="/auth"
              className="btn-primary text-xs py-2 px-4 rounded-full"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
