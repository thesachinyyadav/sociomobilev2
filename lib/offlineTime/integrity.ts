/**
 * Time Integrity Monitor (Phases 2, 5, 8)
 * ────────────────────────────────────────────────────────────
 * Derives a "trusted now" timestamp from the anchor and observes the
 * health of the device clock. Surfaces a single TimeIntegrityReport
 * that callers (scanner, validators) can use to decide whether to
 * allow or reject sensitive operations offline.
 *
 * Detection signals:
 *   - Monotonic vs wall-clock divergence within current session.
 *   - Backward jumps (clock rollback).
 *   - Unreasonable forward jumps.
 *   - Timezone offset changes vs the anchor.
 *   - Anchor older than the configured offline trust horizon.
 */

import { logTimeAudit, warnTimeAudit } from "./audit";
import {
  getAnchor,
  getOfflineTrustHorizonMs,
  isAnchorSameSession,
} from "./anchor";
import type {
  TimeIntegrityLevel,
  TimeIntegrityReport,
  TrustedTimeAnchor,
  TrustedTimeProvenance,
} from "./types";

/** Acceptable drift between monotonic delta and device delta in a session. */
const SESSION_DRIFT_WARN_MS = 30_000;
/** Hard cap — beyond this we treat the device clock as compromised. */
const SESSION_DRIFT_HARD_MS = 5 * 60_000;
/** Hard cap on backward jumps between consecutive samples (1s slack). */
const BACKWARD_JUMP_HARD_MS = 1_000;
/** Forward jump that almost certainly indicates manual clock change. */
const FORWARD_JUMP_HARD_MS = 5 * 60_000;

/** Last observation we made, used for sample-to-sample jump detection. */
interface SampleObservation {
  deviceTimeMs: number;
  perfMs: number;
  timezoneOffsetMinutes: number;
}

let lastObservation: SampleObservation | null = null;

function takeSample(): SampleObservation {
  return {
    deviceTimeMs: Date.now(),
    perfMs:
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : 0,
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
  };
}

function deriveTrustedNow(
  anchor: TrustedTimeAnchor,
  sample: SampleObservation,
): {
  trustedNowMs: number;
  derivation: TimeIntegrityReport["derivation"];
  sessionDriftMs: number;
} {
  if (isAnchorSameSession(anchor)) {
    const monotonicDeltaMs = sample.perfMs - anchor.perfAtSyncMs;
    const deviceDeltaMs = sample.deviceTimeMs - anchor.deviceTimeAtSyncMs;
    const trustedNowMs = anchor.serverTimeMs + monotonicDeltaMs;
    return {
      trustedNowMs,
      derivation: "monotonic",
      sessionDriftMs: Math.abs(deviceDeltaMs - monotonicDeltaMs),
    };
  }
  // Cross-session: monotonic clock has reset, fall back to device-wall delta.
  const deviceDeltaMs = sample.deviceTimeMs - anchor.deviceTimeAtSyncMs;
  return {
    trustedNowMs: anchor.serverTimeMs + deviceDeltaMs,
    derivation: "wall-delta",
    sessionDriftMs: 0,
  };
}

/**
 * Inspect device clock health and return a TimeIntegrityReport.
 * Side-effect: updates lastObservation so the next call can compare deltas.
 */
export function getTimeIntegrityReport(): TimeIntegrityReport {
  const anchor = getAnchor();
  const sample = takeSample();
  const notes: string[] = [];

  // No anchor yet — caller has never seen the server. Surface explicitly so
  // sensitive operations can be blocked or routed through a degraded path.
  if (!anchor) {
    const report: TimeIntegrityReport = {
      level: "no-anchor",
      trustedNowMs: sample.deviceTimeMs,
      derivation: "device-fallback",
      sessionDriftMs: 0,
      anchorAgeMs: Number.POSITIVE_INFINITY,
      notes: ["no anchor — device clock used as last resort"],
    };
    logTimeAudit("integrity.no-anchor", {});
    lastObservation = sample;
    return report;
  }

  const { trustedNowMs, derivation, sessionDriftMs } = deriveTrustedNow(anchor, sample);
  const anchorAgeMs = Math.max(0, trustedNowMs - anchor.serverTimeMs);

  let level: TimeIntegrityLevel = "trusted";

  // Sample-to-sample backward / forward jump detection.
  if (lastObservation) {
    const deviceDelta = sample.deviceTimeMs - lastObservation.deviceTimeMs;
    const perfDelta = sample.perfMs - lastObservation.perfMs;

    if (deviceDelta < -BACKWARD_JUMP_HARD_MS) {
      level = "compromised";
      notes.push(`backward jump ${deviceDelta}ms between samples`);
      warnTimeAudit("integrity.backward-jump", { deviceDelta, perfDelta });
    } else if (
      perfDelta >= 0 &&
      deviceDelta - perfDelta > FORWARD_JUMP_HARD_MS &&
      // Only meaningful in-session: cross-session perfDelta is bogus.
      isAnchorSameSession(anchor)
    ) {
      level = "compromised";
      notes.push(`forward jump device-perf=${deviceDelta - perfDelta}ms`);
      warnTimeAudit("integrity.forward-jump", { deviceDelta, perfDelta });
    }

    if (sample.timezoneOffsetMinutes !== lastObservation.timezoneOffsetMinutes) {
      level = level === "compromised" ? level : "drift-warning";
      notes.push(
        `tz offset changed ${lastObservation.timezoneOffsetMinutes}→${sample.timezoneOffsetMinutes}`,
      );
      warnTimeAudit("integrity.tz-changed", {
        from: lastObservation.timezoneOffsetMinutes,
        to: sample.timezoneOffsetMinutes,
      });
    }
  }

  // Anchor-vs-current timezone divergence.
  if (
    level !== "compromised" &&
    anchor.timezoneOffsetMinutes !== sample.timezoneOffsetMinutes
  ) {
    notes.push(
      `tz offset diverges from anchor: anchor=${anchor.timezoneOffsetMinutes}, current=${sample.timezoneOffsetMinutes}`,
    );
    level = level === "trusted" ? "drift-warning" : level;
  }

  // Session-drift bands.
  if (level !== "compromised") {
    if (sessionDriftMs > SESSION_DRIFT_HARD_MS) {
      level = "compromised";
      notes.push(`session drift ${sessionDriftMs}ms exceeds hard limit`);
    } else if (sessionDriftMs > SESSION_DRIFT_WARN_MS) {
      level = level === "trusted" ? "drift-warning" : level;
      notes.push(`session drift ${sessionDriftMs}ms exceeds warn threshold`);
    }
  }

  // Trust horizon — anchor age check.
  const horizon = getOfflineTrustHorizonMs();
  if (level !== "compromised" && anchorAgeMs > horizon) {
    level = "stale-anchor";
    notes.push(`anchor age ${anchorAgeMs}ms exceeds trust horizon ${horizon}ms`);
  }

  lastObservation = sample;
  const report: TimeIntegrityReport = {
    level,
    trustedNowMs,
    derivation,
    sessionDriftMs,
    anchorAgeMs,
    notes,
  };
  logTimeAudit("integrity.report", {
    level,
    derivation,
    sessionDriftMs,
    anchorAgeMs,
    noteCount: notes.length,
  });
  return report;
}

/**
 * Convenience: returns the best-available "trusted now" as a Date object.
 * Even when the integrity level is poor, callers may still need *some*
 * timestamp — but they should also check `getTimeIntegrityReport().level`
 * before acting on it.
 */
export function getTrustedNow(): Date {
  return new Date(getTimeIntegrityReport().trustedNowMs);
}

/** Resets the in-memory sample observation buffer. Used in tests / restart. */
export function resetTimeIntegrityState(): void {
  lastObservation = null;
}

/**
 * Build a serializable provenance record from a (possibly pre-computed)
 * integrity report — every offline scan should attach this so the server
 * can perform authoritative reconciliation later (Phase 7).
 */
export function buildTrustedTimeProvenance(
  report: TimeIntegrityReport = getTimeIntegrityReport(),
): TrustedTimeProvenance {
  const anchor = getAnchor();
  return {
    trustedTimeMs: report.trustedNowMs,
    deviceTimeMs: Date.now(),
    serverAnchorMs: anchor ? anchor.serverTimeMs : null,
    anchorAgeAtScanMs: anchor ? report.anchorAgeMs : null,
    integrity: report.level,
    derivation: report.derivation,
  };
}
