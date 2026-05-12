# SOCIO Cache Policy Matrix

## Ownership model
| Layer | Ownership | Purpose | Rule |
|---|---|---|---|
| Backend Valkey | Authoritative read cache | Reduce DB latency/load | Source of truth for API read acceleration |
| SWR (frontend) | UI freshness/perceived speed | Revalidate views smoothly | Must align to backend TTL windows |
| apiClient memory cache | Micro-latency optimization | Deduplicate fast repeat GETs | Skip sensitive endpoints |
| Service Worker | Offline/static acceleration | Cache assets/pages only | API requests are network-only |

## Endpoint behavior matrix
| Endpoint Category | Examples | Backend Valkey TTL | SWR Deduping | apiClient memory | Service Worker |
|---|---|---:|---:|---|---|
| Hot read | homepage events, discover feed, event detail | 90s | 90s | allowed (short) | bypass API |
| Hot read (fests) | fest list/detail | 120s | 90–120s | allowed (short) | bypass API |
| Short-lived | catering, notification summary | 20–30s | 20–30s | optional (short) | bypass API |
| Volunteer list | volunteer event lists | 15–30s | 15–30s | bypass for sensitive paths | bypass API |
| Sensitive auth/scanner | auth/session, scan verify, attendance writes | none | no-store patterns | bypass | bypass API |

## Frontend implementation status (this repo)
1. API requests in `public/sw.js` are network-only.
2. `lib/apiClient.ts` uses policy-driven memory TTL and sensitive bypass.
3. SWR windows should be kept in line with this matrix to avoid freshness conflicts.

## Notes
- Frontend caching is complementary; backend Valkey is the authoritative server-side read cache.
- Do not add additional client cache layers for scanner/auth flows.
