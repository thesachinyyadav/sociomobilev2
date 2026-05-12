import { VALKEY_TTL_SECONDS } from "@/lib/cache/policy";

export const VALKEY_KEYSPACE = {
  eventsList: "events:list",
  eventDetail: (eventId: string) => `events:detail:${eventId}`,
  festsList: "fests:list",
  festDetail: (festId: string) => `fests:detail:${festId}`,
  discoverFeed: "discover:feed",
  cateringList: "catering:list",
  notificationSummary: (userId: string) => `notifications:summary:${userId}`,
  volunteerEventList: (userId: string) => `volunteer:events:${userId}`,
  volunteerAccess: (eventId: string, userId: string) => `volunteer:access:${eventId}:${userId}`,
} as const;

export const VALKEY_INVALIDATION_GROUPS = {
  eventMutation: ["events:list", "discover:feed"],
  festMutation: ["fests:list", "discover:feed"],
  cateringMutation: ["catering:list"],
  volunteerMutation: ["volunteer:events:*", "volunteer:access:*"],
  notificationMutation: ["notifications:summary:*"],
} as const;

export const VALKEY_TTL_BY_KEY = {
  [VALKEY_KEYSPACE.eventsList]: VALKEY_TTL_SECONDS.homepageEvents,
  [VALKEY_KEYSPACE.discoverFeed]: VALKEY_TTL_SECONDS.discoverFeed,
  [VALKEY_KEYSPACE.festsList]: VALKEY_TTL_SECONDS.festListings,
  [VALKEY_KEYSPACE.cateringList]: VALKEY_TTL_SECONDS.catering,
} as const;
