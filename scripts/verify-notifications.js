/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const sw = fs.readFileSync("public/sw.js", "utf8");

// Verify all required diagnostic log events
const logs = [
  "[PUSH] Push received",
  "[PUSH] Notification rendered",
  "[PUSH] Notification clicked",
  "[PUSH] Existing client focused",
  "[PUSH] New client opened",
  "[PUSH] Deep link routed",
  "[PUSH] Notification dismissed",
  "[PUSH] Delivery latency:",
  "[PUSH] pushsubscriptionchange fired",
];

console.log("=== Diagnostic Log Events ===");
for (const log of logs) {
  const found = sw.includes(log);
  console.log(found ? "[OK]   " : "[MISS] ", log);
}

// Verify action buttons
console.log("\n=== Action Buttons ===");
console.log(sw.includes('action: "open"')    ? "[OK]    Open action"    : "[MISS]  Open action");
console.log(sw.includes('action: "dismiss"') ? "[OK]    Dismiss action" : "[MISS]  Dismiss action");

// Verify Android UX features
console.log("\n=== Android UX Features ===");
console.log(sw.includes("renotify: true")        ? "[OK]   renotify"                   : "[MISS]  renotify");
console.log(sw.includes("vibrate:")               ? "[OK]   vibrate"                    : "[MISS]  vibrate");
console.log(sw.includes("timestamp:")             ? "[OK]   timestamp"                  : "[MISS]  timestamp");
console.log(sw.includes("requireInteraction")     ? "[OK]  requireInteraction"          : "[MISS]  requireInteraction");
console.log(sw.includes("visibilityState")        ? "[OK]   foreground detection"       : "[MISS]  foreground detection");
console.log(sw.includes("socio:foregroundSync")   ? "[OK]   foregroundSync event"       : "[MISS]  foregroundSync event");
console.log(sw.includes("GROUP_TAG")              ? "[OK]   category grouping"          : "[MISS]  category grouping");
console.log(sw.includes("resolveAbsoluteUrl")     ? "[OK]   absolute URL helper"        : "[MISS]  absolute URL helper");
console.log(sw.includes("ICON_192")               ? "[OK]   192px icon ref"             : "[MISS]  192px icon ref");
console.log(sw.includes("BADGE_72")               ? "[OK]   72px badge ref"             : "[MISS]  72px badge ref");

// Verify Android delivery optimization headers
console.log("\n=== Android Delivery Optimization (NEW) ===");
console.log(sw.includes("pushsubscriptionchange")    ? "[OK]   pushsubscriptionchange handler"       : "[MISS]  pushsubscriptionchange handler");
console.log(sw.includes("data.sentAt")               ? "[OK]   sentAt latency logging"               : "[MISS]  sentAt latency logging");
console.log(sw.includes("socio:subscriptionRotated") ? "[OK]   subscriptionRotated message type"     : "[MISS]  subscriptionRotated message type");
console.log(sw.includes("HIGH LATENCY DETECTED")     ? "[OK]   high-latency warning"                 : "[MISS]  high-latency warning");
console.log(sw.includes("isIntentionalUpdate")       ? "[OK]   unique tag strategy"                  : "[MISS]  unique tag strategy (CRITICAL!)");
console.log(sw.includes("uniqueSuffix")              ? "[OK]   unique tag suffix generation"          : "[MISS]  unique tag suffix");
console.log(sw.includes("renotify: isIntentionalUpdate") ? "[OK]   conditional renotify"              : "[MISS]  conditional renotify");
console.log(sw.includes("receivedAt")                ? "[OK]   receivedAt high-res timing"            : "[MISS]  receivedAt timing");
console.log(sw.includes("renderLatency")             ? "[OK]   render latency log"                   : "[MISS]  render latency log");

// Check webPushService enrichment
const wps = fs.readFileSync("../socio2026v2/server/utils/webPushService.js", "utf8");
console.log("\n=== webPushService.js ===");
console.log(wps.includes("buildAndroidPayload")   ? "[OK]   buildAndroidPayload() defined"         : "[MISS]  buildAndroidPayload()");
console.log(wps.includes("ANDROID_ICON")          ? "[OK]   ANDROID_ICON constant"                 : "[MISS]  ANDROID_ICON");
console.log(wps.includes("ANDROID_BADGE")         ? "[OK]   ANDROID_BADGE constant"                : "[MISS]  ANDROID_BADGE");
console.log(wps.includes("enrichedPayload")       ? "[OK]   enrichedPayload applied"               : "[MISS]  enrichedPayload");
console.log(wps.includes("urgency: \"high\"")      ? "[OK]   urgency:high header"                  : "[MISS]  urgency:high header (CRITICAL!)");
console.log(wps.includes("topic,")                ? "[OK]   topic header (dedup)"                  : "[MISS]  topic header");
console.log(wps.includes("sentAt:")               ? "[OK]   sentAt timestamp injected"             : "[MISS]  sentAt timestamp");
console.log(wps.includes("Promise.allSettled")    ? "[OK]   parallel delivery (allSettled)"        : "[MISS]  parallel delivery (was sequential!)");
console.log(wps.includes("resolveTTL")            ? "[OK]   dynamic TTL by priority"               : "[MISS]  dynamic TTL");
console.log(wps.includes("retryAfterMs")          ? "[OK]   retry on 429/500"                      : "[MISS]  retry logic");
console.log(wps.includes("purgeStaleEndpoint")    ? "[OK]   stale endpoint purge"                  : "[MISS]  stale endpoint purge");

// Check notificationRoutes enrichment
const routes = fs.readFileSync("../socio2026v2/server/routes/notificationRoutes.js", "utf8");
const notificationIdCount = (routes.match(/notificationId:/g) || []).length;
const categoryCount       = (routes.match(/category:/g) || []).length;
const priorityCount       = (routes.match(/priority:/g) || []).length;
const timestampCount      = (routes.match(/timestamp:/g) || []).length;
console.log("\n=== notificationRoutes.js Push Payload Enrichment ===");
console.log(notificationIdCount >= 5 ? "[OK]   notificationId: in " + notificationIdCount + " places" : "[WARN]  notificationId only in " + notificationIdCount + " places");
console.log(categoryCount       >= 5 ? "[OK]   category: in "       + categoryCount       + " places" : "[WARN]  category only in "       + categoryCount       + " places");
console.log(priorityCount       >= 5 ? "[OK]   priority: in "       + priorityCount       + " places" : "[WARN]  priority only in "       + priorityCount       + " places");
console.log(timestampCount      >= 5 ? "[OK]   timestamp: in "      + timestampCount      + " places" : "[WARN]  timestamp only in "      + timestampCount      + " places");

// Check manifest.json for gcm_sender_id
const manifest = fs.readFileSync("public/manifest.json", "utf8");
console.log("\n=== manifest.json ===");
console.log(manifest.includes("gcm_sender_id") ? "[OK]   gcm_sender_id (Android push routing hint)" : "[MISS]  gcm_sender_id");

// Check NotificationContext for boot re-registration
const ctx = fs.readFileSync("context/NotificationContext.tsx", "utf8");
console.log("\n=== NotificationContext.tsx (NEW) ===");
console.log(ctx.includes("reRegisterSubscriptionOnBoot") ? "[OK]   boot re-registration on SW ready"   : "[MISS]  boot re-registration");
console.log(ctx.includes("socio:subscriptionRotated")    ? "[OK]   subscriptionRotated handler"        : "[MISS]  subscriptionRotated handler");
console.log(ctx.includes("liveSub")                      ? "[OK]   live subscription validation check" : "[MISS]  live subscription validation");

console.log("\n=== All checks complete ===");
