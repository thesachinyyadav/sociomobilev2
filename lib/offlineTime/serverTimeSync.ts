/**
 * Server-time capture (Phase 1)
 * ────────────────────────────────────────────────────────────
 * Every authenticated HTTP response carries a `Date` header containing
 * the server's wall-clock time. We treat this as the authoritative
 * source of truth and feed it into the trusted-time anchor.
 *
 * Why not a dedicated /time endpoint?
 *   - Every successful API call already carries the Date header.
 *   - Folding it in here means we get anchor refreshes "for free" on
 *     every screen the user visits — no extra round-trips, no extra
 *     battery cost, no extra backend work.
 *
 * The anchor module itself rejects implausible timestamps, so a misconfigured
 * proxy cannot poison our offline trust state.
 */

import { setAnchor } from "./anchor";
import { logTimeAudit } from "./audit";

/**
 * Inspect a response's Date header and, if valid, update the trusted anchor.
 * Accepts:
 *   - a real `Response` instance
 *   - a `Headers` instance
 *   - a plain Record<string,string> (for environments that return that shape)
 */
export function recordServerTimeFromHeaders(
  headers: Headers | Response | Record<string, string> | null | undefined,
): void {
  if (!headers) return;

  let dateValue: string | null = null;
  try {
    if (headers instanceof Response) {
      dateValue = headers.headers.get("date");
    } else if (headers instanceof Headers) {
      dateValue = headers.get("date");
    } else if (typeof headers === "object") {
      // Capacitor sometimes returns headers keyed in mixed case.
      const map = headers as Record<string, string>;
      dateValue =
        map.date ??
        map.Date ??
        map["Date"] ??
        map["date"] ??
        null;
    }
  } catch {
    return;
  }

  if (!dateValue) return;

  const parsedMs = Date.parse(dateValue);
  if (!Number.isFinite(parsedMs)) {
    logTimeAudit("serverTimeSync.unparseable-date", { dateValue });
    return;
  }

  setAnchor(parsedMs, "response-header");
}
