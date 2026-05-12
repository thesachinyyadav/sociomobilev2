"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/context/EventContext";
import { markNativeOnboardingCompleted, shouldShowNativeOnboarding, touchNativeLaunchStorage, isAndroidNativeBuild } from "@/lib/nativeLaunchState";
import { NativeMicroSplash, NativeOnboardingOverlay } from "@/components/native/NativeOnboardingOverlay";

type LaunchMode = "pending" | "none" | "micro" | "full";

interface StartupSteps {
  authReady: boolean;
  scannerReady: boolean;
  eventsReady: boolean;
  storageReady: boolean;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function prepareScannerSubsystem() {
  if (!isAndroidNativeBuild()) return;
  try {
    const mod = await import("@capacitor-mlkit/barcode-scanning");
    await mod.BarcodeScanner.checkPermissions();
  } catch (error) {
    console.warn("[NativeLaunch] Scanner warmup skipped:", error);
  }
}

async function triggerSubtleRoar() {
  if (typeof window === "undefined") return;
  const AudioCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtor) return;

  try {
    const ctx = new AudioCtor();
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const osc = ctx.createOscillator();

    filter.type = "lowpass";
    filter.frequency.value = 500;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(95, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(63, ctx.currentTime + 0.55);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.015, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.62);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.64);

    await sleep(700);
    await ctx.close();
  } catch (error) {
    console.warn("[NativeLaunch] Roar playback skipped:", error);
  }
}

async function triggerSubtleHaptic() {
  if (!isAndroidNativeBuild()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.warn("[NativeLaunch] Haptic skipped:", error);
  }
}

export default function NativeLaunchController() {
  const { isLoading: authLoading } = useAuth();
  const { isLoading: eventsLoading, allEvents } = useEvents();
  const [mode, setMode] = useState<LaunchMode>("pending");
  const [closing, setClosing] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [accentPulse, setAccentPulse] = useState(false);
  const [steps, setSteps] = useState<StartupSteps>({
    authReady: false,
    scannerReady: false,
    eventsReady: false,
    storageReady: false,
  });

  const finalizedRef = useRef(false);
  const roarPlayedRef = useRef(false);

  useEffect(() => {
    if (!isAndroidNativeBuild()) {
      setMode("none");
      return;
    }

    if (shouldShowNativeOnboarding()) {
      setMode("full");
      return;
    }

    setMode("micro");
    const microTimer = setTimeout(() => setMode("none"), 220);
    return () => clearTimeout(microTimer);
  }, []);

  useEffect(() => {
    if (mode !== "full") return;
    let cancelled = false;

    (async () => {
      try {
        touchNativeLaunchStorage();
      } finally {
        if (!cancelled) {
          setSteps((prev) => ({ ...prev, storageReady: true }));
        }
      }
    })();

    (async () => {
      try {
        await prepareScannerSubsystem();
      } finally {
        if (!cancelled) {
          setSteps((prev) => ({ ...prev, scannerReady: true }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "full") return;
    if (!authLoading) {
      setSteps((prev) => ({ ...prev, authReady: true }));
    }
  }, [mode, authLoading]);

  useEffect(() => {
    if (mode !== "full") return;
    if (!eventsLoading || allEvents.length > 0) {
      setSteps((prev) => ({ ...prev, eventsReady: true }));
    }
  }, [mode, eventsLoading, allEvents.length]);

  const progress = useMemo(() => {
    const done = Number(steps.authReady) + Number(steps.scannerReady) + Number(steps.eventsReady) + Number(steps.storageReady);
    return (done / 4) * 100;
  }, [steps]);

  const message = useMemo(() => {
    if (!steps.authReady) return "Restoring your campus…";
    if (!steps.scannerReady) return "Preparing scanner…";
    if (!steps.eventsReady) return "Loading events…";
    if (!steps.storageReady) return "Optimizing offline storage…";
    return "Almost ready…";
  }, [steps]);

  useEffect(() => {
    if (mode !== "full") return;
    if (finalizedRef.current) return;
    if (!(steps.authReady && steps.scannerReady && steps.eventsReady && steps.storageReady)) return;

    finalizedRef.current = true;
    let cancelled = false;

    (async () => {
      if (!roarPlayedRef.current) {
        roarPlayedRef.current = true;
        await Promise.all([triggerSubtleRoar(), triggerSubtleHaptic()]);
      }

      if (cancelled) return;
      setAccentPulse(true);
      setShowBrand(true);
      await sleep(420);
      if (cancelled) return;

      setClosing(true);
      await sleep(280);
      if (cancelled) return;

      markNativeOnboardingCompleted();
      setMode("none");
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, steps]);

  if (mode === "none" || mode === "pending") return null;
  if (mode === "micro") return <NativeMicroSplash />;

  return (
    <NativeOnboardingOverlay
      message={message}
      progress={progress}
      showBrand={showBrand}
      closing={closing}
      accentPulse={accentPulse}
    />
  );
}
