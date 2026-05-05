
const getApiBase = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.");
    if (!isLocal) {
      return "https://socio2026v2server.vercel.app";
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "https://socio2026v2server.vercel.app";
};

export const API_BASE = getApiBase().replace(/\/api\/?$/, "").replace(/\/$/, "");

export const PWA_API_URL = `${API_BASE}/api`;
