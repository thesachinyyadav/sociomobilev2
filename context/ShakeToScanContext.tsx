"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";

interface ShakeToScanState {
  activeScanEvent: string | null;
  shakeEnabled: boolean;
}

type MotionPermission = "unknown" | "granted" | "denied";

interface ShakeToScanContextValue extends ShakeToScanState {
  motionSupported: boolean;
  motionPermission: MotionPermission;
  enableForEvent: (eventId: string) => void;
  disableShake: () => void;
  requestMotionPermission: () => Promise<boolean>;
}

const STORAGE_KEY = "socio_shake_to_scan";
const DEFAULT_STATE: ShakeToScanState = { activeScanEvent: null, shakeEnabled: false };

function readStoredState(): ShakeToScanState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ShakeToScanState>;
    const activeScanEvent = typeof parsed.activeScanEvent === "string" ? parsed.activeScanEvent : null;
    const shakeEnabled = Boolean(parsed.shakeEnabled && activeScanEvent);
    return { activeScanEvent, shakeEnabled };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_STATE;
  }
}

function writeStoredState(state: ShakeToScanState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const ShakeToScanContext = createContext<ShakeToScanContextValue>({
  ...DEFAULT_STATE,
  motionSupported: false,
  motionPermission: "unknown",
  enableForEvent: () => {},
  disableShake: () => {},
  requestMotionPermission: async () => false,
});

export function useShakeToScan() {
  const context = useContext(ShakeToScanContext);
  if (!context) {
    throw new Error("useShakeToScan must be used within a ShakeToScanProvider");
  }
  return context;
}

export function ShakeToScanProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShakeToScanState>(DEFAULT_STATE);
  const [motionPermission, setMotionPermission] = useState<MotionPermission>("unknown");

  const motionSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "DeviceMotionEvent" in window;
  }, []);

  useEffect(() => {
    const stored = readStoredState();
    setState(stored);
  }, []);

  useEffect(() => {
    if (!motionSupported || typeof window === "undefined") {
      setMotionPermission("denied");
      return;
    }

    // Capacitor Motion handles permissions differently on iOS/Android
    // For iOS, we might still need to call requestPermission
  }, [motionSupported]);

  // Helper: detect iOS Safari / iOS WebView contexts where DeviceMotion
  // permission must be explicitly requested via DeviceMotionEvent.requestPermission()
  const isIosWeb = useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent || navigator.vendor || "";
    const isIosUa = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
    // Safari and WKWebView expose DeviceMotionEvent.requestPermission on iOS
    return isIosUa && typeof (window as any).DeviceMotionEvent !== "undefined";
  }, []);

  const updateState = useCallback((next: ShakeToScanState) => {
    setState(next);
    writeStoredState(next);
  }, []);

  const enableForEvent = useCallback(
    (eventId: string) => {
      if (!eventId) return;
      updateState({ activeScanEvent: eventId, shakeEnabled: true });
      toast.success("Shake to Scan enabled");
    },
    [updateState]
  );

  const disableShake = useCallback(() => {
    updateState(DEFAULT_STATE);
    toast.dismiss("shake-active");
  }, [updateState]);

  const requestMotionPermission = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if (!motionSupported) return false;
    // If the DeviceMotionEvent.requestPermission API exists (iOS web/PWA), call it.
    // This MUST be called from a user gesture (button click / scanner open).
    try {
      const dmEvent = (window as any).DeviceMotionEvent;
      if (dmEvent && typeof dmEvent.requestPermission === "function") {
        try {
          const result = await dmEvent.requestPermission();
          const granted = result === "granted";
          setMotionPermission(granted ? "granted" : "denied");
          if (granted) {
            console.log("[SHAKE] permission granted");
          }
          if (!granted) {
            toast("Motion permission denied. Use manual scan or enable motion in settings.", { duration: 4000, position: "top-center" });
          }
          return granted;
        } catch (e) {
          console.error("ShakeToScan: Permission request failed", e);
          setMotionPermission("denied");
          toast("Motion permission request failed. Use manual scan.", { duration: 4000, position: "top-center" });
          return false;
        }
      }

      // For non-web iOS (Capacitor native) and Android, assume permissions are handled
      // by the native plugin / OS. Mark as granted so listeners may start.
      setMotionPermission("granted");
      console.log("[SHAKE] permission granted");
      return true;
    } catch (err) {
      console.error("ShakeToScan: requestMotionPermission unexpected error", err);
      setMotionPermission("denied");
      return false;
    }
  }, [motionSupported]);

  const contextValue = useMemo(
    () => ({
      activeScanEvent: state.activeScanEvent,
      shakeEnabled: state.shakeEnabled,
      motionSupported,
      motionPermission,
      enableForEvent,
      disableShake,
      requestMotionPermission,
    }),
    [
      state.activeScanEvent,
      state.shakeEnabled,
      motionSupported,
      motionPermission,
      enableForEvent,
      disableShake,
      requestMotionPermission,
    ]
  );

  return (
    <ShakeToScanContext.Provider value={contextValue}>
      {children}
    </ShakeToScanContext.Provider>
  );
}


