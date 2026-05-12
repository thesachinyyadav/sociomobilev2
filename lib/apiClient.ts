import { PWA_API_URL } from "@/lib/apiConfig";
import { CLIENT_CACHE_TTL_MS, shouldBypassClientMemoryCache } from "@/lib/cache/policy";
import { Capacitor, CapacitorHttp } from "@capacitor/core";

type ApiFetchOptions = RequestInit & {
  requireAuth?: boolean;
  retryOnAuthFailure?: boolean;
  timeoutMs?: number;
};

export class ApiError extends Error {
  status: number;
  code: string;
  url: string;
  method: string;
  responseBody: unknown;

  constructor(args: {
    message: string;
    status: number;
    code: string;
    url: string;
    method: string;
    responseBody: unknown;
  }) {
    super(args.message);
    this.name = "ApiError";
    this.status = args.status;
    this.code = args.code;
    this.url = args.url;
    this.method = args.method;
    this.responseBody = args.responseBody;
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeEndpoint(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const clean = endpoint.trim();
  if (!clean) return "/";
  if (clean.startsWith("/api/")) return clean.slice(4);
  if (clean === "/api") return "/";
  return clean.startsWith("/") ? clean : `/${clean}`;
}

function buildUrl(endpoint: string): string {
  const normalized = normalizeEndpoint(endpoint);
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${trimTrailingSlash(PWA_API_URL)}${normalized}`;
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function parseBody(bodyText: string, contentType: string | null): unknown {
  if (!bodyText) return null;
  const isJson = Boolean(contentType && contentType.toLowerCase().includes("application/json"));
  if (!isJson) return bodyText;
  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
}

function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = (error.message || "").toLowerCase();
  return (
    error.name === "TimeoutError" ||
    message.includes("failed to fetch") ||
    message.includes("network")
  );
}

function shouldSetJsonContentType(body: BodyInit | null | undefined): boolean {
  if (!body) return false;
  if (typeof body === "string") return true;
  if (body instanceof URLSearchParams) return false;
  if (body instanceof FormData) return false;
  if (body instanceof Blob) return false;
  if (body instanceof ArrayBuffer) return false;
  if (ArrayBuffer.isView(body)) return false;
  return true;
}

async function getSupabaseAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { supabase } = await import("@/lib/supabaseClient");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function refreshSupabaseAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { supabase } = await import("@/lib/supabaseClient");
  const { data, error } = await supabase.auth.refreshSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const timeoutController = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, timeoutMs);

  const externalSignal = init.signal;
  let abortListener: (() => void) | null = null;

  if (externalSignal) {
    if (externalSignal.aborted) {
      timeoutController.abort();
    } else {
      abortListener = () => timeoutController.abort();
      externalSignal.addEventListener("abort", abortListener, { once: true });
    }
  }

  try {
    if (Capacitor.isNativePlatform()) {
      try {
        const headers: Record<string, string> = {};
        if (init.headers) {
           new Headers(init.headers).forEach((value, key) => {
              headers[key.toLowerCase()] = value;
           });
        }
        
        let dataToSent = init.body;
        if (typeof dataToSent === "string" && headers["content-type"]?.includes("application/json")) {
            try { dataToSent = JSON.parse(dataToSent); } catch { /* ignore */ }
        }

        const options = {
          url,
          headers,
          method: init.method || "GET",
          data: dataToSent,
          connectTimeout: timeoutMs,
          readTimeout: timeoutMs,
        };

        const result = await CapacitorHttp.request(options);
        
        // Ensure status is within valid Range (200-599) for Response constructor.
        // CapacitorHttp returns 0 for network errors.
        const safeStatus = (result.status >= 200 && result.status <= 599) ? result.status : 503;
        
        const bodyText = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
        
        return new Response(bodyText, {
            status: safeStatus,
            headers: result.headers,
        });
      } catch (error) {
          if (timedOut) throw new TimeoutError(`Request timed out after ${timeoutMs}ms`);
          throw error;
      }
    } else {
      try {
        return await fetch(url, {
          ...init,
          signal: timeoutController.signal,
        });
      } catch (error) {
        if (timedOut && error instanceof Error && error.name === "AbortError") {
          throw new TimeoutError(`Request timed out after ${timeoutMs}ms`);
        }
        throw error;
      }
    }
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal && abortListener) {
      externalSignal.removeEventListener("abort", abortListener);
    }
  }
}

// Memory Cache & Request Deduplication
const cache = new Map<string, { data: any; expiry: number }>();
const pendingRequests = new Map<string, Promise<any>>();
const cacheAudit = {
  memoryHits: 0,
  memoryMisses: 0,
  memoryWrites: 0,
  memoryBypasses: 0,
  staleEvictions: 0,
  pendingDedupeHits: 0,
};

function isCacheAuditEnabled(): boolean {
  if (typeof window === "undefined") return process.env.NODE_ENV !== "production";
  try {
    return process.env.NODE_ENV !== "production" || localStorage.getItem("socio_cache_audit") === "1";
  } catch {
    return process.env.NODE_ENV !== "production";
  }
}

function logCacheAudit(event: string, details: Record<string, unknown>) {
  if (!isCacheAuditEnabled()) return;
  console.log(`[CacheAudit] ${event}`, details);
}

export function getApiClientCacheAuditSnapshot() {
  return {
    ...cacheAudit,
    memoryEntries: cache.size,
    pendingRequests: pendingRequests.size,
  };
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    requireAuth = true,
    retryOnAuthFailure = true,
    timeoutMs = 10_000,
    ...requestInit
  } = options;

  const url = buildUrl(endpoint);
  const method = (requestInit.method || "GET").toUpperCase();
  const cacheKey = `${method}:${url}`;
  const bypassClientMemoryCache = shouldBypassClientMemoryCache(endpoint, method, requestInit.cache);

  if (bypassClientMemoryCache && method === "GET") {
    cacheAudit.memoryBypasses += 1;
    logCacheAudit("memory-bypass", { endpoint, cacheKey, requestCacheMode: requestInit.cache ?? "default" });
  }

  // 1. Request Deduplication: If an identical request is already in progress, return its promise
  if (method === "GET" && pendingRequests.has(cacheKey)) {
    cacheAudit.pendingDedupeHits += 1;
    logCacheAudit("pending-dedupe-hit", { cacheKey });
    return pendingRequests.get(cacheKey);
  }

  // 2. Memory Cache: check only if policy allows this endpoint.
  if (method === "GET" && !bypassClientMemoryCache) {
    const cached = cache.get(cacheKey);
    if (!cached) {
      cacheAudit.memoryMisses += 1;
      logCacheAudit("memory-miss", { cacheKey, reason: "empty" });
    } else if (cached.expiry > Date.now()) {
      cacheAudit.memoryHits += 1;
      logCacheAudit("memory-hit", { cacheKey });
      return cached.data as T;
    } else {
      cache.delete(cacheKey);
      cacheAudit.staleEvictions += 1;
      cacheAudit.memoryMisses += 1;
      logCacheAudit("memory-stale-evict", { cacheKey });
    }
  }

  const performFetch = async (): Promise<T> => {
    if (Capacitor.isNativePlatform() && !url.startsWith("https://")) {
      throw new Error("API requests must use HTTPS on native platforms.");
    }

    let authRetried = false;
    let networkRetried = false;
    let token = requireAuth ? await getSupabaseAccessToken() : null;

    for (;;) {
      const headers = new Headers(requestInit.headers);
      if (!headers.has("Accept")) headers.set("Accept", "application/json");
      if (!headers.has("Content-Type") && shouldSetJsonContentType(requestInit.body)) {
        headers.set("Content-Type", "application/json");
      }
      if (requireAuth && token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      try {
        const startedAt = Date.now();
        const response = await fetchWithTimeout(
          url,
          {
            ...requestInit,
            method,
            headers,
            mode: "cors",
            credentials: requestInit.credentials ?? "omit",
            referrerPolicy: requestInit.referrerPolicy ?? "no-referrer",
          },
          timeoutMs
        );
        const durationMs = Date.now() - startedAt;

        const rawBody = await response.text();
        const parsedBody = parseBody(rawBody, response.headers.get("content-type"));

        const isFromEdgeCache = response.headers?.get("x-cache") === "HIT" || response.headers?.get("cf-cache-status") === "HIT";
        logCacheAudit("network-response", {
          method,
          endpoint,
          edgeCache: isFromEdgeCache ? "HIT" : "MISS",
          status: response.status,
          durationMs,
        });

        if (response.status === 401 && requireAuth && retryOnAuthFailure && !authRetried) {
          const refreshed = await refreshSupabaseAccessToken();
          if (refreshed) {
            token = refreshed;
            authRetried = true;
            continue;
          }
        }

        if (!response.ok) {
          const message =
            typeof parsedBody === "string"
              ? parsedBody
              : (parsedBody as any)?.error || `Request failed with status ${response.status}`;
          throw new ApiError({
            message,
            status: response.status,
            code: "API_ERROR",
            url,
            method,
            responseBody: parsedBody,
          });
        }

        // 3. Cache the successful GET response (micro-latency only, policy-gated)
        if (method === "GET" && !bypassClientMemoryCache) {
          cache.set(cacheKey, {
            data: parsedBody,
            expiry: Date.now() + CLIENT_CACHE_TTL_MS.apiMemory,
          });
          cacheAudit.memoryWrites += 1;
          logCacheAudit("memory-write", { cacheKey, ttlMs: CLIENT_CACHE_TTL_MS.apiMemory });
        }

        return parsedBody as T;
      } catch (error) {
        if (isNetworkFailure(error) && !networkRetried) {
          networkRetried = true;
          continue;
        }
        throw error;
      }
    }
  };

  if (method === "GET") {
    const promise = performFetch();
    pendingRequests.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  }

  return performFetch();
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  return apiFetch<T>(endpoint, options);
}
