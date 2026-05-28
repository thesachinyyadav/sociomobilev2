"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useAuth } from "@/context/AuthContext";
import { useShakeToScan } from "@/context/ShakeToScanContext";
import { getActiveVolunteerEvents } from "@/lib/volunteerAccess";

const SAMPLE_INTERVAL_MS = 80;
const IOS_SHAKE_THRESHOLD = 18;
const ANDROID_SHAKE_THRESHOLD = 12;
const DEFAULT_SHAKE_THRESHOLD = 14;
const MIN_SPIKE_INTERVAL_MS = 180;
const SHAKE_WINDOW_MS = 550;
const TRIGGER_COOLDOWN_MS = 2000;

type MotionSample = {
  x: number;
  y: number;
  z: number;
  delta: number;
  threshold: number;
};

export default function ShakeToScanListener() {
  const router = useRouter();
  const pathname = usePathname();
  const { userData } = useAuth();
  const {
    activeScanEvent,
    shakeEnabled,
    motionSupported,
    motionPermission,
    disableShake,
  } = useShakeToScan();

  const [debugEnabled, setDebugEnabled] = useState(false);
  const [listenerAttached, setListenerAttached] = useState(false);
  const [lastSample, setLastSample] = useState<MotionSample | null>(null);
  const [shakeDetected, setShakeDetected] = useState(false);

  const lastSampleRef = useRef(0);
  const lastMotionRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const lastSpikeRef = useRef(0);
  const spikeCountRef = useRef(0);
  const lastTriggerRef = useRef(0);
  const shakeResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeVolunteerEvents = useMemo(
    () => getActiveVolunteerEvents(userData?.volunteerEvents),
    [userData?.volunteerEvents]
  );

  const isVolunteer = activeVolunteerEvents.length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const enabled =
      process.env.NODE_ENV !== "production" ||
      window.location.search.includes("shakeDebug=1") ||
      localStorage.getItem("socio_shake_debug") === "1";
    setDebugEnabled(enabled);
  }, []);

  const logShake = useMemo(() => {
    if (!debugEnabled) {
      return (..._args: unknown[]) => {};
    }
    return (...args: unknown[]) => console.log(...args);
  }, [debugEnabled]);

  const isIos = useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent || navigator.vendor || "";
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  }, []);

  const shakeThreshold = useMemo(() => {
    if (typeof window === "undefined") return DEFAULT_SHAKE_THRESHOLD;
    const ua = navigator.userAgent || navigator.vendor || "";
    if (/Android/.test(ua)) return ANDROID_SHAKE_THRESHOLD;
    if (isIos) return IOS_SHAKE_THRESHOLD;
    return DEFAULT_SHAKE_THRESHOLD;
  }, [isIos]);

  const triggerScanner = async () => {
    if (!activeScanEvent) return;

    const targetUrl = `/volunteer/scanner/${activeScanEvent}`;
    if (pathname === targetUrl) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // Haptics are best-effort only on web/PWA.
    }

    const eventTitle = activeVolunteerEvents.find((event) => event.event_id === activeScanEvent)?.title || "Event";
    logShake("[SHAKE] shake detected", { activeScanEvent, targetUrl, eventTitle });

    setShakeDetected(true);
    if (shakeResetTimerRef.current) {
      clearTimeout(shakeResetTimerRef.current);
    }
    shakeResetTimerRef.current = setTimeout(() => setShakeDetected(false), 1200);

    router.push(targetUrl);
  };

  useEffect(() => {
    if (!shakeEnabled || !activeScanEvent) return;
    if (!isVolunteer) {
      disableShake();
      return;
    }

    const stillAssigned = activeVolunteerEvents.some((event) => event.event_id === activeScanEvent);
    if (!stillAssigned) {
      disableShake();
    }
  }, [activeScanEvent, activeVolunteerEvents, disableShake, isVolunteer, shakeEnabled]);

  useEffect(() => {
    if (!shakeEnabled || !activeScanEvent) return;
    if (!isVolunteer) return;
    if (!motionSupported || motionPermission === "denied" || motionPermission !== "granted") return;
    if (pathname.startsWith("/volunteer/scanner/")) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity ?? event.acceleration;
      logShake("[SHAKE] motion event", event);
      logShake("[SHAKE] acceleration", event.accelerationIncludingGravity);

      if (!acceleration) return;

      const now = Date.now();
      if (now - lastSampleRef.current < SAMPLE_INTERVAL_MS) return;
      lastSampleRef.current = now;

      const x = acceleration.x ?? 0;
      const y = acceleration.y ?? 0;
      const z = acceleration.z ?? 0;
      const lastMotion = lastMotionRef.current;
      lastMotionRef.current = { x, y, z };

      if (!lastMotion) {
        setLastSample({ x, y, z, delta: 0, threshold: shakeThreshold });
        return;
      }

      const delta = Math.abs(x - lastMotion.x) + Math.abs(y - lastMotion.y) + Math.abs(z - lastMotion.z);
      setLastSample({ x, y, z, delta, threshold: shakeThreshold });

      if (delta < shakeThreshold) return;
      if (now - lastSpikeRef.current < MIN_SPIKE_INTERVAL_MS) return;

      if (now - lastSpikeRef.current > SHAKE_WINDOW_MS) {
        spikeCountRef.current = 0;
      }

      spikeCountRef.current += 1;
      lastSpikeRef.current = now;

      if (spikeCountRef.current < 2) return;
      if (now - lastTriggerRef.current < TRIGGER_COOLDOWN_MS) return;

      spikeCountRef.current = 0;
      lastTriggerRef.current = now;

      void triggerScanner();
    };

    logShake("[SHAKE] listener attached");
    setListenerAttached(true);
    window.addEventListener("devicemotion", handleMotion, { passive: true });
    return () => {
      logShake("[SHAKE] listener removed");
      setListenerAttached(false);
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [
    activeScanEvent,
    debugEnabled,
    isVolunteer,
    motionPermission,
    motionSupported,
    pathname,
    router,
    shakeEnabled,
    shakeThreshold,
  ]);

  useEffect(() => {
    return () => {
      if (shakeResetTimerRef.current) {
        clearTimeout(shakeResetTimerRef.current);
      }
    };
  }, []);

  if (!debugEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[min(320px,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-slate-950/95 p-3 text-[11px] text-white shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div>
          <div className="font-semibold uppercase tracking-[0.18em] text-cyan-300">Shake Debug</div>
          <div className="text-white/60">{isIos ? "iPhone" : /Android/.test(navigator.userAgent || "") ? "Android" : "Web"}</div>
        </div>
        <div className={`rounded-full px-2 py-1 text-[10px] font-semibold ${listenerAttached ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/70"}`}>
          {listenerAttached ? "listener attached" : "listener idle"}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-white/80">
        <div className="rounded-xl bg-white/5 p-2">
          <div className="text-white/50">Permission</div>
          <div className="font-semibold">{motionPermission}</div>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <div className="text-white/50">Threshold</div>
          <div className="font-semibold">{shakeThreshold.toFixed(0)}</div>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <div className="text-white/50">Shake</div>
          <div className={`font-semibold ${shakeDetected ? "text-amber-300" : "text-white"}`}>{shakeDetected ? "detected" : "idle"}</div>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <div className="text-white/50">Event</div>
          <div className="font-semibold">{activeScanEvent || "none"}</div>
        </div>
      </div>

      <div className="mt-2 rounded-xl bg-white/5 p-2 font-mono text-[10px] leading-5 text-cyan-100">
        <div>x: {lastSample?.x?.toFixed(2) ?? "n/a"}</div>
        <div>y: {lastSample?.y?.toFixed(2) ?? "n/a"}</div>
        <div>z: {lastSample?.z?.toFixed(2) ?? "n/a"}</div>
        <div>delta: {lastSample?.delta?.toFixed(2) ?? "n/a"}</div>
      </div>
    </div>
  );
}
