import { Capacitor } from "@capacitor/core";

const getApiBase = () => {
  // 1. Force Production URL if running in a native app (Capacitor)
  if (Capacitor.isNativePlatform()) {
    console.log("📱 [API_CONFIG] Running on Native Platform. Forcing Production API.");
    return "https://socio2026v2server.vercel.app";
  }

  // 2. Handle browser/PWA logic
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // In Capacitor WebView, hostname is 'localhost', but we handled it above.
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.");
    if (!isLocal) {
      return "https://socio2026v2server.vercel.app";
    }
  }
  
  // 3. Fallback to ENV or Production
  return process.env.NEXT_PUBLIC_API_URL || "https://socio2026v2server.vercel.app";
};

export const API_BASE = getApiBase().replace(/\/api\/?$/, "").replace(/\/$/, "");

export const PWA_API_URL = `${API_BASE}/api`;

const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.withsocio.com";
// Force HTTPS globally to ensure deep links, App Links, and sharing always use the secure context.
// This prevents issues if the user accidentally configures Vercel with an http:// domain.
export const APP_URL = rawAppUrl.replace(/^http:\/\/(?!localhost|127\.0\.0\.1|192\.168\.)/, "https://");

