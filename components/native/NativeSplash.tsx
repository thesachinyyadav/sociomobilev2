"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface NativeSplashProps {
  onComplete: () => void;
}

export default function NativeSplash({ onComplete }: NativeSplashProps) {
  const [progress, setProgress] = useState(15);
  const [isExiting, setIsExiting] = useState(false);
  const { isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Phase 1: Immediately hide the native Android splash screen layer
    // since this React layer matches it perfectly.
    const hideNativeSplash = async () => {
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
        console.log("🌸 [NativeSplash] Native splash hidden successfully.");
      } catch (e) {
        console.warn("[NativeSplash] Failed to hide native splash:", e);
      }
    };
    void hideNativeSplash();
  }, []);

  useEffect(() => {
    if (isExiting) return;

    // Smoothly crawl progress to 90%
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + (90 - prev) * 0.15;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isExiting]);

  useEffect(() => {
    // Once authentication/session loading completes, finish the progress bar
    if (!authLoading) {
      setProgress(100);
      
      const exitTimeout = setTimeout(() => {
        setIsExiting(true);
        
        // After fade out transition finishes, unmount
        const completeTimeout = setTimeout(() => {
          onComplete();
        }, 400); // Match CSS transition duration (400ms)
        
        return () => clearTimeout(completeTimeout);
      }, 250); // Hold 100% for 250ms for visual satisfaction

      return () => clearTimeout(exitTimeout);
    }
  }, [authLoading, onComplete]);

  // Failsafe timer (4.5s max) to prevent the app from hanging if Supabase / network lags
  useEffect(() => {
    const failsafe = setTimeout(() => {
      console.warn("⚠️ [NativeSplash] Failsafe triggered to prevent splash hang.");
      setProgress(100);
      setIsExiting(true);
      const completeTimeout = setTimeout(() => {
        onComplete();
      }, 400);
      return () => clearTimeout(completeTimeout);
    }, 4500);

    return () => clearTimeout(failsafe);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 bg-[#FFFFFF] z-[99999] flex flex-col items-center justify-center transition-opacity duration-400 ease-out select-none pointer-events-auto"
      style={{
        opacity: isExiting ? 0 : 1,
      }}
    >
      {/* Subtle oversized faded "S" watermark in the background */}
      <svg
        viewBox="0 0 63 82"
        className="absolute w-[300px] h-[300px] text-[#123B8C] opacity-[0.03] pointer-events-none select-none"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -52%)",
        }}
      >
        <path
          fill="currentColor"
          d="M32.6035 80.4229C23.5462 80.4229 16.1087 78.2719 10.291 73.9646C4.4681 69.6625 1.3431 63.4959 0.916016 55.4646H23.9785C24.1973 58.1886 25.0098 60.1834 26.416 61.4438C27.8171 62.6938 29.6243 63.3188 31.8327 63.3188C33.8171 63.3188 35.4473 62.8188 36.7285 61.8188C38.0202 60.8188 38.666 59.4386 38.666 57.6729C38.666 55.3969 37.5931 53.6313 35.4577 52.3813C33.3327 51.1313 29.8743 49.7302 25.0827 48.1729C20.0098 46.4959 15.9056 44.8604 12.7702 43.2771C9.64518 41.6938 6.92122 39.3761 4.60352 36.3188C2.2806 33.2667 1.12435 29.2719 1.12435 24.3396C1.12435 19.3292 2.37435 15.0375 4.87435 11.4646C7.38477 7.89689 10.8535 5.19377 15.2702 3.36043C19.6868 1.51668 24.6868 0.5896 30.2702 0.5896C39.3223 0.5896 46.5514 2.70939 51.9577 6.94377C57.3744 11.1834 60.2702 17.1261 60.6452 24.7771H37.1244C37.0514 22.4177 36.3379 20.6521 34.9785 19.4854C33.6139 18.3084 31.8639 17.7146 29.7285 17.7146C28.1035 17.7146 26.7754 18.1938 25.7493 19.1521C24.7181 20.1 24.2077 21.4594 24.2077 23.2354C24.2077 24.7094 24.7754 25.9802 25.916 27.0479C27.0514 28.1052 28.4681 29.0219 30.166 29.7979C31.8587 30.5792 34.3587 31.5479 37.666 32.7146C42.6087 34.4125 46.6764 36.0896 49.8744 37.7563C53.0827 39.4125 55.8431 41.7302 58.166 44.7146C60.4837 47.6886 61.6452 51.4594 61.6452 56.0271C61.6452 60.6677 60.4837 64.8292 58.166 68.5063C55.8431 72.1886 52.4889 75.1 48.1035 77.2354C43.7285 79.3604 38.5619 80.4229 32.6035 80.4229Z"
        />
      </svg>

      {/* Centered Logo badge */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-[120px] h-[120px] rounded-full overflow-hidden shadow-sm bg-white flex items-center justify-center">
          <img
            src="/applogo.png"
            alt="SOCIO Logo"
            className="w-full h-full object-cover"
            draggable="false"
          />
        </div>
      </div>

      {/* Minimalist horizontal progress bar */}
      <div className="absolute bottom-[170px] left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
        <div className="w-32 h-[3px] bg-[#F5F7FA] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FFC107] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Bottom curved waves */}
      <svg
        viewBox="0 0 360 150"
        className="absolute bottom-0 left-0 w-full h-[150px] pointer-events-none select-none"
        preserveAspectRatio="none"
      >
        {/* Yellow Wave (right side) */}
        <path
          fill="#FFC107"
          d="M 360,150 L 360,30 C 300,30 220,90 140,150 Z"
        />
        {/* Blue Wave (left side) */}
        <path
          fill="#123B8C"
          d="M 0,150 L 0,10 C 120,10 200,70 280,150 Z"
        />
      </svg>
    </div>
  );
}
