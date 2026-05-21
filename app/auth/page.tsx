"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, Loader2Icon, WifiOffIcon } from "@/components/icons";
import { useAuth } from "@/context/AuthContext";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5">
      <path
        d="M21.6 12.23c0-.73-.07-1.43-.18-2.09H12v3.96h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.97-4.33 2.97-7.39Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.89 6.61-2.39l-3.24-2.5c-.89.6-2.03.95-3.37.95-2.6 0-4.8-1.76-5.58-4.12H3.07v2.58A9.98 9.98 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.42 13.94A6.03 6.03 0 0 1 6.1 12c0-.67.12-1.32.32-1.94V7.48H3.07A10.05 10.05 0 0 0 2 12c0 1.61.39 3.13 1.07 4.52l3.35-2.58Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.94c1.47 0 2.8.5 3.85 1.49l2.88-2.88C16.95 2.9 14.7 2 12 2a9.98 9.98 0 0 0-8.93 5.48l3.35 2.58C7.2 7.7 9.4 5.94 12 5.94Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthPage() {
  const { session, userData, isLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncOnlineState = () => setIsOffline(!window.navigator.onLine);
    syncOnlineState();

    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);
    return () => {
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
  }, []);

  // Reset isSubmitting when the user returns to the page (e.g., after Google browser closes)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setIsSubmitting(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also handle Capacitor app resume
    const handleAppResume = () => setIsSubmitting(false);
    window.addEventListener("resume", handleAppResume);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resume", handleAppResume);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const error = new URLSearchParams(window.location.search).get("error");
    if (!error) {
      setAuthError(null);
    } else if (error === "missing_supabase_config") {
      setAuthError("Sign-in is not configured for this environment yet.");
    } else {
      setAuthError("Authentication failed. Please try again.");
    }

    const handleAuthError = (e: any) => {
      setAuthError(e.detail || "Authentication failed during deep link restoration.");
      setIsSubmitting(false);
    };

    window.addEventListener("auth_error", handleAuthError);
    return () => {
      window.removeEventListener("auth_error", handleAuthError);
    };
  }, []);

  useEffect(() => {
    if (isLoading || !session || !userData) return;

    let destination = "/discover";
    if (typeof window !== "undefined") {
      const returnTo = sessionStorage.getItem("returnTo");
      if (returnTo && returnTo.startsWith("/")) {
        destination = returnTo;
      }
      sessionStorage.removeItem("returnTo");
    }
    router.replace(destination);
  }, [session, userData, isLoading, router]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setAuthError(e?.message || "Could not start Google sign-in. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "radial-gradient(#c3c6d5 0.7px, transparent 0.7px)", backgroundSize: "24px 24px" }} />
      <div className="absolute -top-20 -right-16 h-72 w-72 rounded-full bg-[var(--color-primary)]/12 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-[var(--color-accent)]/18 blur-3xl" />

      <main className="relative mx-auto flex min-h-dvh w-full max-w-[420px] flex-col items-center justify-center px-6 pb-16">
        <div className="w-full space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Image
              src="/applogo.png"
              alt="SOCIO"
              width={80}
              height={80}
              priority
              className="mx-auto rounded-[22px] shadow-[0_12px_32px_rgba(1,31,123,0.18)]"
            />
            <Image
              src="/logo.svg"
              alt="SOCIO"
              width={140}
              height={42}
              priority
              className="mx-auto h-auto w-[140px]"
            />
          </div>

          <div className="rounded-[24px] border border-white bg-white/92 p-6 shadow-[0_10px_40px_rgba(1,31,123,0.08)] backdrop-blur-sm">
            <h1 className="mb-5 text-xl font-extrabold tracking-tight text-[var(--color-primary-dark)]">
              Sign in
            </h1>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting || isLoading || isOffline}
              className="flex h-[52px] w-full items-center justify-center gap-3 rounded-xl bg-[var(--color-primary)] px-4 font-bold text-white shadow-[0_10px_24px_rgba(1,31,123,0.16)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2Icon className="h-5 w-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <GoogleMark />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {authError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex items-start gap-2 text-red-700">
                  <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-xs font-semibold">{authError}</p>
                </div>
              </div>
            )}

            {isOffline && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--color-bg)] px-3 py-2.5">
                <WifiOffIcon className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                <p className="text-xs text-[var(--color-text-muted)]">No connection — check your network.</p>
              </div>
            )}
          </div>

          <p className="text-center text-[11px] leading-relaxed text-[var(--color-text-light)]">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline">Terms</Link> and{" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </main>

    </div>
  );
}
