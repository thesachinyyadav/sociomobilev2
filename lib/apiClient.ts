
import { useAuth } from "@/context/AuthContext";
import { PWA_API_URL } from "@/lib/apiConfig";
import { Capacitor } from "@capacitor/core";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Since this is a utility function and not a hook,
  // we cannot call useAuth() directly.
  // We will pass the session/token as part of the options or
  // use a dedicated session getter.

  const url = `${PWA_API_URL}${endpoint}`;
  const headers = new Headers(options.headers);

  // The token should be passed via options.authCodedToken or similar
  // for now we'll rely on the caller providing the header,
  // but we'll add the logging and structure here.

  console.log(`[API REQUEST] ${options.method || "GET"} ${url}`, {
    headers: Object.fromEntries(headers.entries()),
    platform: Capacitor.getPlatform(),
  });

  try {
    const response = await fetch(url, { ...options, headers });
    console.log(`[API RESPONSE] ${response.status} ${url}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API ERROR] ${response.status}: ${errorText}`);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[API NETWORK ERROR] ${url}:`, error);
    throw error;
  }
}
