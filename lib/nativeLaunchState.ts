import { Capacitor } from "@capacitor/core";

const FIRST_LAUNCH_COMPLETED_KEY = "socio_native_first_launch_completed";
const LAST_MAJOR_VERSION_KEY = "socio_native_last_onboarding_major";
const LAST_TOUCH_KEY = "socio_native_launch_touch";

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
