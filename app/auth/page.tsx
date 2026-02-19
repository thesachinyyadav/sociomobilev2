"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AuthPage() {
  const { session, isLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (session) {
      let destination = "/discover";
      if (typeof window !== "undefined") {
        const returnTo = sessionStorage.getItem("returnTo");
        if (returnTo && returnTo.startsWith("/")) {
          destination = returnTo;
        }
        sessionStorage.removeItem("returnTo");
      }
      router.replace(destination);
    } else {
      signInWithGoogle();
    }
  }, [session, isLoading, signInWithGoogle, router]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[var(--color-primary-dark)] to-[var(--color-primary)] flex flex-col items-center justify-center gap-6 text-white px-8">
      <Image src="/logo.svg" alt="SOCIO" width={140} height={44} priority className="brightness-0 invert" />
      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]"
            style={{
              animation: "pulse-ring 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <p className="text-sm opacity-70">Redirecting to sign in...</p>
    </div>
  );
}
