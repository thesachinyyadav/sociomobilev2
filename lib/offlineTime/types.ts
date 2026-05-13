/**
 * Shared types for the offline trusted-time subsystem.
 * Kept in a separate module so consumers can import types without
 * pulling in the runtime modules (audit, anchor, integrity, validation).
 */

/**
 * Snapshot of the last successful server-time sync.
 * Persisted across page reloads / app restarts.
 */
export interface TrustedTimeAnchor {
  /** Server wall-clock time (epoch ms) at the moment we received it. */
  serverTimeMs: number;
  /** Device wall-clock time (Date.now() epoch ms) sampled at the same moment. */
  deviceTimeAtSyncMs: number;
  /** performance.now() value at the same moment (monotonic since page load). */
  perfAtSyncMs: number;
  /**
   * Wall-clock origin of the current page-load session:
   *   Date.now() - performance.now()
   * Used to detect "anchor created in a previous session" and to spot
   * page-load timestamps that imply backwards device-clock motion.
   */
  pageLoadOriginMs: number;
  /** IANA timezone offset (minutes from UTC) at the time of sync. */
  timezoneOffsetMinutes: number;
  /** Source of the server time signal (http header, explicit ping, etc). */
  source: "response-header" | "explicit-ping" | "initial-bootstrap";
  /** Wall-clock time at which we created/refreshed this anchor (for UI display). */
  createdAtMs: number;
}

/** How much we trust the derived "now" right at this moment. */
export type TimeIntegrityLevel =
  /** Anchor present, monotonic check OK, drift small — full trust. */
  | "trusted"
  /** No anchor yet — we have not seen the server. Block sensitive ops. */
  | "no-anchor"
  /** Anchor present but old (past offline trust horizon, degraded mode). */
  | "stale-anchor"
  /** Anchor is too old (past block horizon). Hard block. */
  | "expired-anchor"
  /** Drift or jump detected within tolerance, but suspicious. */
  | "drift-warning"
  /** Hard tamper signal: backward jump, large forward jump, TZ change. */
  | "compromised";

export interface TimeIntegrityReport {
  level: TimeIntegrityLevel;
  /** Estimated trusted "now" in epoch ms — may be Date.now() as last resort. */
  trustedNowMs: number;
  /** Whether trustedNowMs is monotonic-anchored (same-session) or wall-anchored (cross-session). */
  derivation: "monotonic" | "wall-delta" | "device-fallback";
  /** ms of drift between monotonic delta and device delta within this session. */
  sessionDriftMs: number;
  /** Age of the anchor relative to estimated now (ms). */
  anchorAgeMs: number;
  /** Free-text reasons / observations — surfaced in audit logs only. */
  notes: string[];
}

/**
 * Trusted-time provenance attached to every offline scan so the server can
 * later reconcile timestamps against its own clock (Phase 7).
 *
 * Storage of the scan itself lives in `@/lib/offline` (Dexie) — this type is
 * the *time* slice we add to those records.
 */
export interface TrustedTimeProvenance {
  /** Best-effort epoch-ms when the scan actually occurred. */
  trustedTimeMs: number;
  /** Device wall-clock at scan moment (Date.now()) — untrusted. */
  deviceTimeMs: number;
  /** Server anchor time used to derive trustedTimeMs, or null when no anchor. */
  serverAnchorMs: number | null;
  /** Anchor age at the time of scan (ms), or null. */
  anchorAgeAtScanMs: number | null;
  /** Integrity level captured at the moment the scan was taken. */
  integrity: TimeIntegrityLevel;
  /** Whether trustedTimeMs is monotonic-anchored, wall-anchored, or fallback. */
  derivation: "monotonic" | "wall-delta" | "device-fallback";
}
