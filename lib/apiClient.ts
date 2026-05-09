
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
  // endpoint should be something like "/users/me"
  const baseUrl = PWA_API_URL.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const headers = new Headers(options.headers);

  // 2. Authorization injection
  const authHeader = headers.get("Authorization");

  console.log(`[API REQUEST] ${options.method || "GET"} ${url}`, {
    headers: Object.fromEntries(headers.entries()),
    tokenPresent: !!authHeader,
    platform: Capacitor.getPlatform(),
  });

  try {
    const response = await fetch(url, { ...options, headers });

    console.log(`[API RESPONSE] ${response.status} ${url}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API ERROR] ${response.status}: ${errorText}`);

      const error = new Error(errorText || `API Error ${response.status}`);
      (error as any).status = response.status;
      (error as any).code = "API_ERROR";
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error(`[API NETWORK ERROR] ${url}:`, error);
    throw error;
  }
}
