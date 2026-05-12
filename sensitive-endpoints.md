# Sensitive Endpoint Cache Rules

## Never cache (server or client)
1. Auth/session validation endpoints.
2. JWT/token handling endpoints.
3. Attendance write endpoints.
4. QR verification and scanner authorization endpoints.
5. Role/permission mutation endpoints.
6. Volunteer access decisions when security-sensitive.

## Frontend enforcement in this repo
- `public/sw.js`: API traffic is network-only; no SW API response caching.
- `lib/apiClient.ts`: policy bypass for sensitive endpoints and `cache: "no-store"` requests.
- Existing scanner/auth flows continue to hit authoritative backend truth.

## Backend enforcement requirements
1. Middleware guard must short-circuit cache wrappers for sensitive routes.
2. Route-level annotations should default sensitive endpoints to `bypass=true`.
3. Security review checklist must block release if any sensitive route becomes cacheable.
