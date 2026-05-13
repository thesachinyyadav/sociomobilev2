/**
 * Offline Trusted Time — public API barrel.
 *
 * Consumers should import from "@/lib/offlineTime" rather than reaching
 * into the internal modules directly, so we have a stable surface to
 * evolve later (e.g., swap localStorage for Capacitor Preferences).
 */

export { getAnchor, setAnchor, clearAnchor, isAnchorSameSession, getOfflineTrustHorizonMs } from "./anchor";
export {
  getTimeIntegrityReport,
  getTrustedNow,
  resetTimeIntegrityState,
  buildTrustedTimeProvenance,
} from "./integrity";
export {
  decideOfflineScan,
  integrityLabel,
  DEFAULT_DRIFT_TOLERANCE_MS,
  type OfflineDecision,
  type OfflineRejectReason,
} from "./validation";
export { recordServerTimeFromHeaders } from "./serverTimeSync";
export type {
  TrustedTimeAnchor,
  TimeIntegrityLevel,
  TimeIntegrityReport,
  TrustedTimeProvenance,
} from "./types";
