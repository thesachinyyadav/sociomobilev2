/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const sw = fs.readFileSync("public/sw.js", "utf8");

// Verify all 7 required diagnostic log events
const logs = [
  "[PUSH] Push received",
  "[PUSH] Notification rendered",
  "[PUSH] Notification clicked",
  "[PUSH] Existing client focused",
  "[PUSH] New client opened",
  "[PUSH] Deep link routed",
  "[PUSH] Notification dismissed",
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
console.log(sw.includes("renotify: true")    ? "[OK]   renotify"                : "[MISS]  renotify");
console.log(sw.includes("vibrate:")          ? "[OK]   vibrate"                 : "[MISS]  vibrate");
console.log(sw.includes("timestamp:")        ? "[OK]   timestamp"               : "[MISS]  timestamp");
console.log(sw.includes("requireInteraction") ? "[OK]  requireInteraction"      : "[MISS]  requireInteraction");
console.log(sw.includes("visibilityState")   ? "[OK]   foreground suppression"  : "[MISS]  foreground suppression");
console.log(sw.includes("socio:foregroundSync") ? "[OK] foregroundSync event"   : "[MISS]  foregroundSync event");
console.log(sw.includes("GROUP_TAG")         ? "[OK]   category grouping"       : "[MISS]  category grouping");
console.log(sw.includes("resolveAbsoluteUrl") ? "[OK]  absolute URL helper"     : "[MISS]  absolute URL helper");
console.log(sw.includes("ICON_192")          ? "[OK]   192px icon ref"          : "[MISS]  192px icon ref");
console.log(sw.includes("BADGE_72")          ? "[OK]   72px badge ref"          : "[MISS]  72px badge ref");

// Check webPushService enrichment
const wps = fs.readFileSync("../socio2026v2/server/utils/webPushService.js", "utf8");
console.log("\n=== webPushService.js ===");
console.log(wps.includes("buildAndroidPayload") ? "[OK]   buildAndroidPayload() defined" : "[MISS]  buildAndroidPayload()");
console.log(wps.includes("ANDROID_ICON")        ? "[OK]   ANDROID_ICON constant"         : "[MISS]  ANDROID_ICON");
console.log(wps.includes("ANDROID_BADGE")       ? "[OK]   ANDROID_BADGE constant"        : "[MISS]  ANDROID_BADGE");
console.log(wps.includes("enrichedPayload")     ? "[OK]   enrichedPayload applied"       : "[MISS]  enrichedPayload");

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

console.log("\n=== All checks complete ===");
