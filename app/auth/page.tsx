"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  Loader2Icon,
  SchoolIcon,
  WifiOffIcon,
  ShieldCheckIcon,
  UsersIcon,
  ZapIcon
} from "@/components/icons";
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
    <div className="relative h-dvh w-full overflow-hidden bg-white text-[var(--color-text)] flex flex-col items-center">
      <div className="w-full max-w-[420px] h-full flex flex-col bg-white shadow-xl relative overflow-hidden border-x border-gray-100 justify-between">

        {/* Upper White Brand Section */}
        <div className="flex flex-col items-center pt-6 pb-2 bg-white relative z-10">
          <div className="flex h-15 w-15 items-center justify-center rounded-[16px] bg-[var(--color-primary)] shadow-[0_10px_24px_rgba(1,31,123,0.16)] mb-3.5">
            <SchoolIcon className="h-8 w-8 text-white" strokeWidth={2} />
          </div>
          
          <h2 className="text-[26px] font-[900] tracking-tight text-[var(--color-primary)] leading-none mb-2">
            SOCIO
          </h2>
          
          <p className="text-[14px] font-bold text-[#0F172A] mb-0.5">
            Your community, connected.
          </p>
          <p className="text-[11px] font-medium text-gray-500">
            Manage, engage and grow together.
          </p>
        </div>

        {/* Custom SVG Wave Divider */}
        <div className="w-full h-[40px] overflow-hidden leading-none relative z-10 bg-white">
          <svg viewBox="0 0 1440 80" className="relative block w-full h-full" preserveAspectRatio="none">
            <path d="M0,80 C360,30 720,120 1080,40 C1200,10 1320,10 1440,50 L1440,80 L0,80 Z" fill="#EDF4FF" />
          </svg>
        </div>

        {/* Lower Light-Blue Gradient Section */}
        <div className="relative flex-1 w-full bg-gradient-to-b from-[#EDF4FF] via-[#F4F8FF] to-white px-5 pb-3.5 pt-1 z-10 flex flex-col items-center justify-between overflow-hidden">

          {/* Sign-in Card */}
          <div className="relative w-full max-w-[360px] rounded-2xl border border-white/60 bg-white/95 p-5 shadow-[0_10px_30px_rgba(1,31,123,0.05)] backdrop-blur-md z-10 my-auto">
            <h3 className="text-[18px] font-extrabold text-[var(--color-primary-dark)] tracking-tight mb-0.5">
              Sign in
            </h3>
            <p className="text-[12px] font-medium text-gray-500 mb-5">
              Welcome back! Please sign in to continue.
            </p>
            
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting || isLoading || isOffline}
              className="flex h-[42px] w-full items-center justify-center gap-3 rounded-lg bg-[#0047FF] px-4 text-xs font-bold text-white shadow-[0_6px_14px_rgba(0,71,255,0.18)] hover:bg-[#003be0] active:scale-[0.98] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 disabled:scale-100 disabled:shadow-none"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm p-0.5">
                    <GoogleMark />
                  </div>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
            
            {authError && (
              <div className="mt-3 rounded-lg border border-red-100 bg-red-50/80 px-3 py-2">
                <div className="flex items-start gap-1.5 text-red-700">
                  <AlertCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  <p className="text-[11px] font-semibold">{authError}</p>
                </div>
              </div>
            )}

            {isOffline && (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                <WifiOffIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <p className="text-[11px] font-medium text-gray-500">No connection — check your network.</p>
              </div>
            )}
          </div>

          <div className="w-full flex flex-col items-center mt-auto z-10">
            {/* Interactive Sign up switcher */}
            <p className="text-center text-[12px] font-semibold text-gray-500 mb-3.5">
              Don't have an account?{" "}
              <button
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || isLoading || isOffline}
                className="text-[#0047FF] hover:underline font-bold bg-transparent border-none p-0 cursor-pointer disabled:opacity-50"
              >
                Sign up
              </button>
            </p>

            {/* Features Capsule Footer */}
            <div className="w-full max-w-[360px] bg-white/70 border border-white/50 backdrop-blur-md rounded-xl p-3 shadow-[0_6px_20px_rgba(1,31,123,0.03)] grid grid-cols-3 gap-1.5 items-center justify-items-center mb-4">
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0047FF]/10">
                  <ShieldCheckIcon className="h-3.5 w-3.5 text-[#0047FF]" />
                </div>
                <span className="text-[9px] font-bold text-gray-700 tracking-tight">Secure & Private</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center border-x border-gray-100 w-full">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0047FF]/10">
                  <UsersIcon className="h-3.5 w-3.5 text-[#0047FF]" />
                </div>
                <span className="text-[9px] font-bold text-gray-700 tracking-tight">Community First</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0047FF]/10">
                  <ZapIcon className="h-3.5 w-3.5 text-[#0047FF]" />
                </div>
                <span className="text-[9px] font-bold text-gray-700 tracking-tight">Smart & Simple</span>
              </div>
            </div>

            {/* Terms & Privacy */}
            <p className="text-center text-[10px] leading-relaxed text-gray-400">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline font-semibold hover:text-gray-600 transition-colors">Terms</Link> and{" "}
              <Link href="/privacy" className="underline font-semibold hover:text-gray-600 transition-colors">Privacy Policy</Link>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
