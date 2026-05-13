/**
 * OfflineTimeAudit
 * ────────────────────────────────────────────────────────────
 * Lightweight namespaced logger for the trusted-time subsystem.
 * Enabled by default in non-production; opt-in via localStorage in production:
 *   localStorage.setItem('socio_offline_time_audit', '1')
 */

const AUDIT_STORAGE_KEY = "socio_offline_time_audit";

function isAuditEnabled(): boolean {
  if (typeof window === "undefined") return process.env.NODE_ENV !== "production";
  try {
    if (process.env.NODE_ENV !== "production") return true;
    return window.localStorage?.getItem(AUDIT_STORAGE_KEY) === "1";
  } catch {
    return process.env.NODE_ENV !== "production";
  }
}

export function logTimeAudit(event: string, details: Record<string, unknown> = {}) {
  if (!isAuditEnabled()) return;
  // eslint-disable-next-line no-console
  console.log(`[OfflineTimeAudit] ${event}`, details);
}

export function warnTimeAudit(event: string, details: Record<string, unknown> = {}) {
  if (!isAuditEnabled()) return;
  // eslint-disable-next-line no-console
  console.warn(`[OfflineTimeAudit] ${event}`, details);
}
