import { Capacitor } from "@capacitor/core";

const FIRST_LAUNCH_COMPLETED_KEY = "socio_native_first_launch_completed";
const LAST_MAJOR_VERSION_KEY = "socio_native_last_onboarding_major";
const LAST_TOUCH_KEY = "socio_native_launch_touch";
const TRANSITION_EVENTS = {
  auth: "socio:transition:auth",
  recoveryStart: "socio:transition:recovery:start",
  recoveryStop: "socio:transition:recovery:stop",
} as const;

export type RecoveryReason =
  | "auth"
  | "events"
  | "scanner-verify"
  | "network-reconnect"
  | "session-refresh"
  | "cache-restore"
  | "route-recovery";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getCurrentAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";
}

function getMajor(version: string): number {
  const majorText = String(version).split(".")[0] || "1";
  const parsed = Number.parseInt(majorText, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function isAndroidNativeBuild(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export function shouldShowNativeOnboarding(): boolean {
  if (!isAndroidNativeBuild() || !canUseStorage()) return false;

  const completed = localStorage.getItem(FIRST_LAUNCH_COMPLETED_KEY) === "true";
  if (!completed) return true;

  const storedMajor = Number.parseInt(localStorage.getItem(LAST_MAJOR_VERSION_KEY) || "", 10);
  const currentMajor = getMajor(getCurrentAppVersion());
  if (!Number.isFinite(storedMajor)) return true;
  return storedMajor !== currentMajor;
}

export function markNativeOnboardingCompleted(): void {
  if (!isAndroidNativeBuild() || !canUseStorage()) return;
  const currentMajor = getMajor(getCurrentAppVersion());
  localStorage.setItem(FIRST_LAUNCH_COMPLETED_KEY, "true");
  localStorage.setItem(LAST_MAJOR_VERSION_KEY, String(currentMajor));
  localStorage.setItem(LAST_TOUCH_KEY, new Date().toISOString());
}

export function touchNativeLaunchStorage(): void {
  if (!isAndroidNativeBuild() || !canUseStorage()) return;
  // Read/write existing startup caches to keep this step tied to real storage work.
  localStorage.getItem("socio_pwa_session");
  localStorage.getItem("socio_pwa_user_data");
  localStorage.setItem(LAST_TOUCH_KEY, new Date().toISOString());
}

export function isReducedSensoryMode(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const saveData = (navigator as any)?.connection?.saveData === true;
    const reducedAudio = localStorage.getItem("socio_reduced_audio") === "1";
    return Boolean(reducedMotion || saveData || reducedAudio);
  } catch {
    return true;
  }
}

function dispatchTransitionEvent(eventName: string, detail: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function emitAuthTransition(event: string, message: string) {
  dispatchTransitionEvent(TRANSITION_EVENTS.auth, { event, message, at: Date.now() });
}

export function startRecoveryTransition(message: string, reason: RecoveryReason) {
  dispatchTransitionEvent(TRANSITION_EVENTS.recoveryStart, { message, reason, at: Date.now() });
}

export function stopRecoveryTransition(reason: RecoveryReason) {
  dispatchTransitionEvent(TRANSITION_EVENTS.recoveryStop, { reason, at: Date.now() });
}

export const NATIVE_TRANSITION_EVENT_NAMES = TRANSITION_EVENTS;