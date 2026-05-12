# SOCIO Valkey Invalidation Strategy

## Principles
1. Invalidate by domain group, not ad-hoc key strings.
2. Prefer deterministic key builders to avoid orphan keys.
3. Run invalidation synchronously in mutation handlers for correctness.

## Invalidation matrix
| Mutation/Event | Keys to Invalidate |
|---|---|
| Event updated/deleted | `events:list`, `events:detail:{eventId}`, `discover:feed`, related fest keys |
| Fest updated/deleted | `fests:list`, `fests:detail:{festId}`, derived event/fest discover keys |
| Catering updated | `catering:list`, impacted event detail keys |
| Volunteer assignment changed | `volunteer:events:{userId}`, `volunteer:access:{eventId}:{userId}` |
| Notification state changed | `notifications:summary:{userId}` |

## Suggested helper pattern
```ts
export async function invalidateEventDomain(eventId: string, festId?: string) {
  await cache.del(key.events.list());
  await cache.del(key.events.detail(eventId));
  await cache.del(key.discover.feed());
  if (festId) {
    await cache.del(key.fests.detail(festId));
    await cache.del(key.fests.list());
  }
}
```

## Safety checks
- Never invalidate auth/scanner sensitive runtime state via cached assumptions.
- Add metric counters for each invalidation path and alert on spikes/failures.
