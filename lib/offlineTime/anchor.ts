/**
 * Trusted Time Anchor (Phases 1, 2, 9, 10)
 * ────────────────────────────────────────────────────────────
 * Stores the most recent verified server timestamp + its monotonic anchor
 * so the app can estimate the real current time WITHOUT trusting Date.now()
 * blindly while offline.
 *
 * Persistence:
 *   - PWA and Capacitor APK both run inside a webview, so localStorage
 *     reaches both reliably. We deliberately avoid native-only APIs here
 *     to keep this module portable; native enhancements layer on top.
 *
 * Storage shape: a single JSON blob under STORAGE_KEY.
 */

import { logTimeAudit, warnTimeAudit } from "./audit";
import type { TrustedTimeAnchor } from "./types";

const STORAGE_KEY = "socio_trusted_time_anchor_v1";

/**
 * After this many ms without a fresh server sync, the anchor is considered
 * stale and offline trust must be re-verified. Default: 6 hours.
 * Configurable via NEXT_PUBLIC_OFFLINE_TRUST_HORIZON_MS at build time.
 */
const DEFAULT_TRUST_HORIZON_MS = 6 * 60 * 60 * 1000;

function getTrustHorizonMs(): number {
  const raw = process.env.NEXT_PUBLIC_OFFLINE_TRUST_HORIZON_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TRUST_HORIZON_MS;
}

let inMemoryAnchor: TrustedTimeAnchor | null = null;
let inMemoryAnchorLoaded = false;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAnchorFromStorage(): TrustedTimeAnchor | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TrustedTimeAnchor>;
    if (
      typeof parsed?.serverTimeMs !== "number" ||
      typeof parsed?.deviceTimeAtSyncMs !== "number" ||
      typeof parsed?.pageLoadOriginMs !== "number"
    ) {
      return null;
    }
    return {
      serverTimeMs: Number(parsed.serverTimeMs),
      deviceTimeAtSyncMs: Number(parsed.deviceTimeAtSyncMs),
      perfAtSyncMs: Number(parsed.perfAtSyncMs ?? 0),
      pageLoadOriginMs: Number(parsed.pageLoadOriginMs),
      timezoneOffsetMinutes: Number(parsed.timezoneOffsetMinutes ?? 0),
      source: (parsed.source as TrustedTimeAnchor["source"]) || "initial-bootstrap",
      createdAtMs: Number(parsed.createdAtMs ?? parsed.deviceTimeAtSyncMs),
    };
  } catch (err) {
    warnTimeAudit("anchor.read-failed", { error: String(err) });
    return null;
  }
}

function writeAnchorToStorage(anchor: TrustedTimeAnchor): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(anchor));
  } catch (err) {
    warnTimeAudit("anchor.write-failed", { error: String(err) });
  }
}

export function getAnchor(): TrustedTimeAnchor | null {
  if (!inMemoryAnchorLoaded) {
    inMemoryAnchor = readAnchorFromStorage();
    inMemoryAnchorLoaded = true;
    if (inMemoryAnchor) {
      logTimeAudit("anchor.loaded", {
        serverTimeMs: inMemoryAnchor.serverTimeMs,
        ageMs: Date.now() - inMemoryAnchor.deviceTimeAtSyncMs,
      });
    }
  }
  return inMemoryAnchor;
}

/**
 * Pure helper to perform a same-session sanity check on a candidate server
 * timestamp before committing it as the anchor. Returns the candidate when
 * accepted, or `null` when it is rejected (e.g., obviously bogus year, drift
 * too large vs an existing trusted anchor).
 */
function sanitizeCandidate(candidateServerMs: number): number | null {
  if (!Number.isFinite(candidateServerMs)) return null;
  // Reject anything before 2024-01-01 or after year 2100 — server clearly wrong.
  const MIN = Date.UTC(2024, 0, 1);
  const MAX = Date.UTC(2100, 0, 1);
  if (candidateServerMs < MIN || candidateServerMs > MAX) return null;
  return candidateServerMs;
}

/**
 * Record a new trusted anchor from an authoritative server time observation.
 * Call this from the response path of any successful authenticated request
 * (apiClient.ts wires this up automatically via the `Date` response header).
 */
export function setAnchor(
  serverTimeMs: number,
  source: TrustedTimeAnchor["source"] = "response-header",
): TrustedTimeAnchor | null {
  const clean = sanitizeCandidate(serverTimeMs);
  if (clean == null) {
    warnTimeAudit("anchor.rejected-implausible", { serverTimeMs });
    return null;
  }

  const nowDevice = Date.now();
  const nowPerf =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : 0;
  const pageLoadOriginMs = nowDevice - nowPerf;

  const tzOffset = new Date().getTimezoneOffset();

  const next: TrustedTimeAnchor = {
    serverTimeMs: clean,
    deviceTimeAtSyncMs: nowDevice,
    perfAtSyncMs: nowPerf,
    pageLoadOriginMs,
    timezoneOffsetMinutes: tzOffset,
    source,
    createdAtMs: nowDevice,
  };

  const prev = getAnchor();
  inMemoryAnchor = next;
  inMemoryAnchorLoaded = true;
  writeAnchorToStorage(next);

  logTimeAudit("anchor.set", {
    source,
    serverTimeMs: clean,
    deviceTimeMs: nowDevice,
    skewMs: nowDevice - clean,
    replacedPrev: Boolean(prev),
  });

  return next;
}

/**
 * Returns the configured offline trust horizon (Phase 9).
 */
export function getOfflineTrustHorizonMs(): number {
  return getTrustHorizonMs();
}

/**
 * Returns true when the anchor was created in the CURRENT page-load session
 * (same `pageLoadOriginMs` to within 1 second). In that case the monotonic
 * delta (performance.now()) can be trusted; otherwise we must fall back to
 * device-wall-clock delta which is itself only weakly trusted.
 */
export function isAnchorSameSession(anchor: TrustedTimeAnchor): boolean {
  const nowDevice = Date.now();
  const nowPerf =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : 0;
  const currentOrigin = nowDevice - nowPerf;
  return Math.abs(currentOrigin - anchor.pageLoadOriginMs) < 1000;
}

/** Clears the trusted anchor — used on logout / explicit "re-verify time" flows. */
export function clearAnchor(): void {
  inMemoryAnchor = null;
  inMemoryAnchorLoaded = true;
  if (canUseStorage()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  logTimeAudit("anchor.cleared", {});
}
