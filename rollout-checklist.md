# Valkey Rollout Checklist (Backend Integration)

## 1. Foundation
1. Provision managed Valkey (Upstash or equivalent).
2. Configure env vars for URL/token and timeout/retry policy.
3. Implement singleton client + typed cache wrappers.

## 2. Policy wiring
1. Add namespace key helpers and TTL constants.
2. Implement sensitive-route bypass guard middleware.
3. Apply read caching only to approved hot/short-lived endpoints.

## 3. Invalidation
1. Add domain invalidation helpers for event/fest/catering/volunteer/notifications.
2. Wire invalidation into mutation handlers.
3. Add tests for stale-prevention after mutation.

## 4. Observability
1. Emit `[ValkeyCache]` logs: hit, miss, stale-serve, write, invalidate, error.
2. Track hit ratio, miss ratio, invalidation count, latency deltas.
3. Add dashboard panels and alert thresholds for cache failure spikes.

## 5. Failsafe + security
1. Ensure cache failures always fall back to DB without request failure.
2. Verify scanner/auth flows are unaffected when cache is down.
3. Confirm no JWT/token/authz/attendance decisions are cached.

## 6. Frontend alignment verification
1. Keep SW API handling network-only.
2. Keep apiClient memory cache as short micro-cache and sensitive bypassed.
3. Keep SWR dedupe windows aligned with backend TTLs.

## 7. Release gate
1. Compare before/after latency for homepage, discover, fests, event detail.
2. Confirm DB query reduction and acceptable cache hit ratio.
3. Run end-to-end scanner/auth/volunteer correctness checks before production.
