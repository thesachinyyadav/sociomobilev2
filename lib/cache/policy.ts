export const CACHE_OWNERSHIP = {
  valkey: "Authoritative backend read cache",
  swr: "Frontend UI freshness layer",
  apiClientMemory: "Micro-latency optimization only",
  serviceWorker: "Offline/static asset acceleration only",
} as const;

export const CLIENT_CACHE_TTL_MS = {
  apiMemory: 10_000,
} as const;

export const SWR_DEDUPING_MS = {
  hotRead: 15_000,
  shortRead: 10_000,
  registrationRead: 15_000,
} as const;

export const VALKEY_TTL_SECONDS = {
  homepageEvents: 90,
  discoverFeed: 90,
  eventDetails: 90,
  festListings: 120,
  festDetails: 120,
  catering: 30,
  notificationSummary: 30,
  volunteerEventList: 20,
  volunteerAccessValidation: 10,
} as const;

export const NEVER_CACHE_DOMAINS = [
  "attendance writes",
  "qr verification mutations",
  "auth/session validation",
  "jwt handling",
  "role mutations",
  "permission mutations",
  "scanner verification",
  "attendance authorization",
] as const;
