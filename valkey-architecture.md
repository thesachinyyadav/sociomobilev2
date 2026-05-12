# SOCIO Backend Valkey Architecture (Handoff)

## Scope
This repository does **not** contain backend API runtime code.  
This document is the backend integration handoff for plug-and-play Valkey rollout.

## Recommended backend directory structure
```text
backend/
  src/
    lib/
      cache/
        client.ts              # singleton Valkey client
        keys.ts                # namespace helpers
        ttl.ts                 # TTL constants
        policy.ts              # cache ownership + sensitive bypass rules
        metrics.ts             # hit/miss/stale/invalidation counters
        wrapper.ts             # getOrSet / SWR helper
        invalidation.ts        # mutation-driven invalidation helpers
    middleware/
      cacheRead.ts
      cacheWrite.ts
      cacheBypassGuard.ts
    routes/
      events.ts
      fests.ts
      discover.ts
      catering.ts
      notifications.ts
      volunteer.ts
```

## Singleton connection architecture
1. Build one process-wide client.
2. Reuse connection across requests.
3. Read env from runtime config only.
4. If cache connection fails, continue to DB path.

## Key namespace conventions
- `events:list`
- `events:detail:{eventId}`
- `fests:list`
- `fests:detail:{festId}`
- `discover:feed`
- `catering:list`
- `notifications:summary:{userId}`
- `volunteer:events:{userId}`
- `volunteer:access:{eventId}:{userId}`

## TTL matrix (authoritative backend)
- Homepage events: 90s
- Discover feed: 90s
- Event details: 90s
- Fest listings: 120s
- Fest details: 120s
- Catering: 30s
- Notification summaries: 20–30s
- Volunteer event lists: 15–30s
- Volunteer access validation: 5–10s or bypass

## Sensitive bypass rules
Never cache:
- auth/session validation
- JWT/token handling
- QR verification mutations
- attendance writes/authorization
- role/permission mutations

## Suggested integration points
- Route handlers for read-heavy endpoints: cache read-through wrapper.
- Mutation handlers: invalidate related key groups immediately.
- Middleware guard: enforce sensitive endpoint bypass before any cache attempt.

## Example pseudocode
```ts
// wrapper.ts
export async function getOrSetJson<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
  opts?: { swr?: boolean; bypass?: boolean }
): Promise<T> {
  if (opts?.bypass) return loader();

  try {
    const cached = await valkey.get(key);
    if (cached) {
      metrics.hit(key);
      if (opts?.swr) revalidateInBackground(key, ttlSeconds, loader);
      return JSON.parse(cached) as T;
    }
    metrics.miss(key);
  } catch (e) {
    metrics.error("read", key, e);
  }

  const fresh = await loader();
  try {
    await valkey.set(key, JSON.stringify(fresh), { ex: ttlSeconds });
    metrics.write(key);
  } catch (e) {
    metrics.error("write", key, e);
  }
  return fresh;
}
```

## Failsafe strategy
- Cache read failure => continue DB read.
- Cache write failure => return DB response.
- Never block scanner/auth flows on cache dependency.
