
import { PWA_API_URL } from "@/lib/apiConfig";
import { Capacitor } from "@capacitor/core";

/**
 * Centralized API client for all backend requests.
 * Ensures absolute URLs, injects authentication, and provides detailed logging for Capacitor.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // 1. Ensure absolute URL (CRITICAL for Capacitor)
  const baseUrl = PWA_API_URL.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  // Android WebView/Capacitor hardening
  if (Capacitor.isNativePlatform() && !url.startsWith("https://")) {
    console.error(`🚨 [API_CLIENT] SECURITY VIOLATION: Non-HTTPS URL detected in Capacitor: ${url}`);
    throw new Error("API requests must be HTTPS on mobile.");
  }

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && (options.method === "POST" || options.method === "PUT")) {
    headers.set("Content-Type", "application/json");
  }

  const authHeader = headers.get("Authorization");
  
  // 2. Default Timeout (10s)
  const timeoutMs = 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  const finalOptions: RequestInit = {
    ...options,
    headers,
    mode: "cors", // Explicitly enable CORS
    credentials: "omit", // standard for OAuth-based bearer tokens
    referrerPolicy: "no-referrer",
    signal: options.signal || controller.signal,
  };

  console.log(`🚀 [API REQUEST] ${options.method || "GET"} ${url}`, {
    tokenPresent: !!authHeader,
    platform: Capacitor.getPlatform(),
    origin: typeof window !== "undefined" ? window.location.origin : "SSR",
  });

  try {
    const startTime = Date.now();
    const response = await fetch(url, finalOptions);
    const duration = Date.now() - startTime;

    console.log(`✅ [API RESPONSE] ${response.status} (${duration}ms) ${url}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [API ERROR] ${response.status} ${url}: ${errorText}`);

      const error = new Error(errorText || `API Error ${response.status}`);
      (error as any).status = response.status;
      (error as any).code = "API_ERROR";
      (error as any).url = url;
      throw error;
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error(`⏱️ [API TIMEOUT] ${url} exceeded ${timeoutMs}ms`);
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    console.error(`📡 [API NETWORK FAILURE] ${url}:`, error.message || error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
