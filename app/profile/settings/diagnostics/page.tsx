"use client";

/**
 * Developer Tools → Test Notifications
 * ─────────────────────────────────────────────────────────────
 * Full-fidelity diagnostic surface for the SOCIO notification
 * pipeline. Exposes:
 *   • Send Test Notification (server → OneSignal → device)
 *   • Check Push Permission
 *   • Check OneSignal Subscription state
 *   • Check / Copy External User ID
 *   • Show Push Token (subscription id)
 *   • Force Re-register Service Worker
 *   • Trigger Local Notification
 *   • Check OneSignal Initialization
 *   • Copy Diagnostic Report (one-tap JSON dump)
 *
 * Mounted at /profile/settings/diagnostics.
 */

import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { Button } from "@/components/Button";
import { apiRequest } from "@/lib/apiClient";
import { isOneSignalFullyInitialized } from "@/lib/onesignal";
import { getNotificationAnalyticsSummary } from "@/lib/notificationAnalytics";

interface Diagnostic {
  appVersion: string;
  platform: string;
  isNative: boolean;
  oneSignalInitialized: boolean;
  permission: string;
  optedIn: string;
  subscriptionId: string;
  pushToken: string;
  externalId: string;
  externalIdBound: boolean;
  serviceWorkers: string[];
  swScope: string[];
  origin: string;
  isSecureContext: boolean;
  lastHydration: string;
  lastNotificationReceived: string;
  analytics: ReturnType<typeof getNotificationAnalyticsSummary> | null;
  serverConfig: any;
  clientAppIdSuffix: string;
  serverAppIdSuffix: string | null;
  appIdMatches: boolean | null;
  collectedAt: string;
  userEmail: string;
}

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
const CLIENT_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "";
const LS_LAST_NOTIF_KEY = "socio_last_notif_received";

export default function DiagnosticsPage() {
  const { userData } = useAuth();
  const { enablePushNotifications, refresh } = useNotifications();
  const [diag, setDiag] = useState<Diagnostic | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const collect = useCallback(async () => {
    let permission = "n/a";
    let optedIn: any = "n/a";
    let subId = "n/a";
    let token = "n/a";
    const expectedExternalId = userData?.email?.toLowerCase() || "";
    let externalId = expectedExternalId || "n/a";
    let externalIdBound = false;
    let osInit = false;
    const swList: string[] = [];
    const swScope: string[] = [];
    let serverConfig: any = null;

    try {
      if (typeof Notification !== "undefined") permission = Notification.permission;
    } catch {}

    try {
      if (Capacitor.isNativePlatform()) {
        const OS = (await import("onesignal-cordova-plugin")).default as any;
        if (OS) {
          osInit = true;
          subId = OS.User?.pushSubscription?.id || "none";
          optedIn = String(OS.User?.pushSubscription?.optedIn ?? "unknown");
          token = OS.User?.pushSubscription?.token || "none";
          try {
            const native = (OS.User?.externalId || "").toString().toLowerCase();
            if (native) {
              externalId = native;
              externalIdBound = !!expectedExternalId && native === expectedExternalId;
            }
          } catch {}
        }
      } else {
        const OS = typeof window !== "undefined" ? (window as any).OneSignal : null;
        if (OS) {
          osInit = isOneSignalFullyInitialized();
          subId = OS.User?.PushSubscription?.id || "none";
          token = OS.User?.PushSubscription?.token || "none";
          optedIn = String(OS.User?.PushSubscription?.optedIn ?? "unknown");
          try {
            const reported = (OS.User?.externalId || "").toString().toLowerCase();
            if (reported) {
              externalId = reported;
              externalIdBound = !!expectedExternalId && reported === expectedExternalId;
            } else {
              externalId = "(not set on device)";
              externalIdBound = false;
            }
          } catch {
            externalIdBound = false;
          }
        }
      }
    } catch (e) {
      console.warn("[Diagnostics] OneSignal probe failed", e);
    }

    try {
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          const script = r.active?.scriptURL?.replace(location.origin, "") || "(inactive)";
          swList.push(`[${r.active?.state || "pending"}] ${script}`);
          swScope.push(r.scope);
        }
      }
    } catch (e) {
      console.warn("[Diagnostics] SW probe failed", e);
    }

    try {
      serverConfig = await apiRequest<any>("/notifications/diagnostics", { requireAuth: false });
    } catch (e: any) {
      serverConfig = { error: e?.message || "unreachable" };
    }

    const lastNotif = (typeof window !== "undefined" && localStorage.getItem(LS_LAST_NOTIF_KEY)) || "never";

    const clientAppIdSuffix = CLIENT_APP_ID ? CLIENT_APP_ID.slice(-6) : "(unset)";
    const serverAppIdSuffix: string | null = serverConfig?.config?.appIdSuffix ?? null;
    const appIdMatches: boolean | null =
      serverAppIdSuffix && CLIENT_APP_ID
        ? serverAppIdSuffix === clientAppIdSuffix
        : null;

    setDiag({
      appVersion: APP_VERSION,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      oneSignalInitialized: osInit,
      permission,
      optedIn: String(optedIn),
      subscriptionId: subId,
      pushToken: token,
      externalId,
      externalIdBound,
      serviceWorkers: swList,
      swScope,
      origin: typeof window !== "undefined" ? window.location.origin : "ssr",
      isSecureContext: typeof window !== "undefined" ? window.isSecureContext : false,
      lastHydration: new Date().toLocaleString(),
      lastNotificationReceived: lastNotif,
      analytics: getNotificationAnalyticsSummary(),
      serverConfig,
      clientAppIdSuffix,
      serverAppIdSuffix,
      appIdMatches,
      collectedAt: new Date().toISOString(),
      userEmail: userData?.email || "(signed out)",
    });
  }, [userData?.email]);

  useEffect(() => {
    collect();
    // Watch for foreground notifications and update the "last received" pill.
    const onFg = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const stamp = new Date().toISOString();
      try {
        localStorage.setItem(
          LS_LAST_NOTIF_KEY,
          JSON.stringify({ at: stamp, title: detail?.title, type: detail?.type })
        );
      } catch {}
      collect();
    };
    window.addEventListener("socio:foregroundNotification", onFg);
    return () => window.removeEventListener("socio:foregroundNotification", onFg);
  }, [collect]);

  const handleSendTest = async () => {
    setBusy("test");
    try {
      const result = await apiRequest<any>("/notifications/test", { method: "POST" });
      setLastResult(result);
      const recipients = result?.oneSignal?.recipients;
      if (recipients > 0) {
        toast.success(`OneSignal accepted (recipients=${recipients})`);
      } else if (result?.oneSignal?.warning) {
        toast.error(`OneSignal warning: ${result.oneSignal.warning}`);
      } else {
        toast.error("Test sent but OneSignal returned 0 recipients — check subscription state below");
      }
      refresh();
      collect();
    } catch (e: any) {
      setLastResult({ error: e?.message, status: e?.status, body: e?.responseBody });
      toast.error(e?.message || "Test failed");
    } finally {
      setBusy(null);
    }
  };

  const handleRequestPermission = async () => {
    setBusy("perm");
    try {
      await enablePushNotifications();
      await collect();
    } finally {
      setBusy(null);
    }
  };

  const handleForceReregisterSW = async () => {
    setBusy("sw");
    try {
      if (!("serviceWorker" in navigator)) {
        toast.error("ServiceWorker API not available");
        return;
      }
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        if (r.active?.scriptURL?.includes("OneSignalSDK") || r.scope.includes("/push/")) {
          await r.unregister();
          console.log("[Diagnostics] Unregistered:", r.scope);
        }
      }
      // Re-register by re-importing initOneSignal.
      const { initOneSignal, _resetOneSignalState } = await import("@/lib/onesignal");
      _resetOneSignalState();
      initOneSignal();
      toast.success("Service worker re-registration kicked off");
      setTimeout(() => collect(), 1500);
    } catch (e: any) {
      toast.error(e?.message || "Re-register failed");
    } finally {
      setBusy(null);
    }
  };

  const handleForceRelink = async () => {
    setBusy("relink");
    try {
      if (!userData?.email) {
        toast.error("Sign in first — no email on session");
        return;
      }
      const externalId = userData.email.toLowerCase();
      if (Capacitor.isNativePlatform()) {
        const OS = (await import("onesignal-cordova-plugin")).default as any;
        if (!OS) {
          toast.error("Native OneSignal handle unavailable");
          return;
        }
        OS.logout();
        OS.login(externalId);
        OS.User?.addTags?.({ email: externalId });
      } else {
        const OS = (await import("react-onesignal")).default;
        if (!OS) {
          toast.error("Web OneSignal SDK not loaded");
          return;
        }
        try {
          await OS.logout();
        } catch {}
        if (
          Notification.permission === "granted" &&
          OS.User?.PushSubscription &&
          OS.User.PushSubscription.optedIn === false
        ) {
          try {
            await OS.User.PushSubscription.optIn();
          } catch {}
        }
        await OS.login(externalId);
        await OS.User.addTags({ email: externalId });
        for (let i = 0; i < 4; i += 1) {
          const reported = (OS.User?.externalId || "").toString().toLowerCase();
          if (reported === externalId) break;
          await new Promise((r) => setTimeout(r, 500 * (i + 1)));
          try {
            await OS.login(externalId);
          } catch {}
        }
      }
      toast.success(`Re-linked identity to ${externalId}`);
      await collect();
    } catch (e: any) {
      console.error("[Diagnostics] Force re-link failed", e);
      toast.error(e?.message || "Force re-link failed");
    } finally {
      setBusy(null);
    }
  };

  const handleLocalNotification = async () => {
    setBusy("local");
    try {
      if (typeof Notification === "undefined") {
        toast.error("Notification API not available");
        return;
      }
      if (Notification.permission !== "granted") {
        toast.error("Permission not granted — enable notifications first");
        return;
      }
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) {
        await reg.showNotification("🧪 Local Notification", {
          body: "This was fired directly by the page — bypasses OneSignal.",
          icon: "/applogo.png",
          tag: "socio-local-test",
        });
      } else {
        new Notification("🧪 Local Notification", {
          body: "Direct Notification API — no SW.",
        });
      }
    } catch (e: any) {
      toast.error(e?.message || "Local notification failed");
    } finally {
      setBusy(null);
    }
  };

  const handleCopyReport = async () => {
    try {
      const payload = JSON.stringify(
        { diagnostic: diag, lastResult, analytics: getNotificationAnalyticsSummary() },
        null,
        2
      );
      await navigator.clipboard.writeText(payload);
      toast.success("Diagnostic report copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  if (!userData) return null;

  const isHealthy =
    diag &&
    diag.permission === "granted" &&
    diag.optedIn === "true" &&
    diag.subscriptionId !== "none" &&
    diag.oneSignalInitialized;

  return (
    <div className="pwa-page px-4 pb-[calc(var(--bottom-nav)+var(--safe-bottom)+96px)] pt-5 animate-fade-in space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold">Developer Tools</h1>
          <p className="text-xs text-gray-500">Notification diagnostics & test harness</p>
        </div>
        <div
          className={`text-[11px] font-bold px-2 py-1 rounded-full ${
            isHealthy ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {isHealthy ? "Healthy" : "Needs attention"}
        </div>
      </header>

      {/* Quick actions */}
      <div className="card p-4 space-y-2">
        <h2 className="text-sm font-bold mb-2">Tests</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleSendTest} isLoading={busy === "test"} fullWidth>
            Send Test Notification
          </Button>
          <Button onClick={handleRequestPermission} isLoading={busy === "perm"} fullWidth variant="secondary">
            Check Push Permission
          </Button>
          <Button onClick={collect} fullWidth variant="outline">
            Refresh Subscription State
          </Button>
          <Button onClick={handleLocalNotification} isLoading={busy === "local"} fullWidth variant="outline">
            Trigger Local Notification
          </Button>
          <Button onClick={handleForceReregisterSW} isLoading={busy === "sw"} fullWidth variant="outline">
            Force Re-register SW
          </Button>
          <Button onClick={handleForceRelink} isLoading={busy === "relink"} fullWidth variant="outline">
            Force Re-link Identity
          </Button>
          <Button onClick={handleCopyReport} fullWidth variant="accent">
            Copy Diagnostic Report
          </Button>
        </div>
      </div>

      {/* App-ID + identity sanity check — most common cause of recipients=0 */}
      {diag && (
        <div className="card p-4 space-y-1 text-xs">
          <h2 className="text-sm font-bold mb-2">Targeting Sanity Check</h2>
          <Row
            label="Client App ID suffix"
            value={diag.clientAppIdSuffix}
            good={!!diag.serverAppIdSuffix && diag.appIdMatches === true}
          />
          <Row
            label="Server App ID suffix"
            value={diag.serverAppIdSuffix || "(server unreachable)"}
            good={!!diag.serverAppIdSuffix && diag.appIdMatches === true}
          />
          <Row
            label="App ID match"
            value={
              diag.appIdMatches === null
                ? "unknown"
                : diag.appIdMatches
                ? "match"
                : "MISMATCH — server and device target different OneSignal apps"
            }
            good={diag.appIdMatches === true}
          />
          <Row
            label="External ID bound to this device"
            value={diag.externalIdBound ? "yes" : "no — server pushes will return recipients=0"}
            good={diag.externalIdBound}
          />
          {!diag.externalIdBound && diag.optedIn === "true" && (
            <p className="text-[11px] text-amber-700 mt-1">
              Tap <span className="font-bold">Force Re-link Identity</span> above, then run Send Test Notification again.
            </p>
          )}
          {diag.appIdMatches === false && (
            <p className="text-[11px] text-red-700 mt-1">
              NEXT_PUBLIC_ONESIGNAL_APP_ID on the device does not match ONESIGNAL_APP_ID on the server.
              Until these match, no push can ever be delivered. Fix the env var and redeploy.
            </p>
          )}
        </div>
      )}

      {/* Live state */}
      <div className="card p-4 space-y-1.5 text-xs font-mono">
        <h2 className="text-sm font-bold font-sans mb-2">Live State</h2>
        {diag ? (
          <>
            <Row label="App Version" value={diag.appVersion} />
            <Row label="Platform" value={`${diag.platform}${diag.isNative ? " (native)" : " (web)"}`} />
            <Row label="Origin" value={diag.origin} />
            <Row label="Secure Context" value={String(diag.isSecureContext)} />
            <Row label="OneSignal Init" value={String(diag.oneSignalInitialized)} good={diag.oneSignalInitialized} />
            <Row label="Permission" value={diag.permission} good={diag.permission === "granted"} />
            <Row label="Opted In" value={diag.optedIn} good={diag.optedIn === "true"} />
            <Row label="Subscription ID" value={diag.subscriptionId} good={diag.subscriptionId !== "none"} copyable />
            <Row label="Push Token" value={diag.pushToken} copyable />
            <Row label="External ID" value={diag.externalId} copyable good={diag.externalIdBound} />
            <Row label="User Email" value={diag.userEmail} />
            <Row label="Last Hydration" value={diag.lastHydration} />
            <Row label="Last Notification" value={diag.lastNotificationReceived} />

            <details className="pt-2">
              <summary className="cursor-pointer text-blue-600 font-sans text-xs font-bold">Service Workers ({diag.serviceWorkers.length})</summary>
              <pre className="text-[10px] mt-1 whitespace-pre-wrap break-all bg-gray-50 p-2 rounded">
                {diag.serviceWorkers.length ? diag.serviceWorkers.join("\n") : "(none registered)"}
              </pre>
            </details>

            <details>
              <summary className="cursor-pointer text-blue-600 font-sans text-xs font-bold">Server Config</summary>
              <pre className="text-[10px] mt-1 whitespace-pre-wrap break-all bg-gray-50 p-2 rounded">
                {JSON.stringify(diag.serverConfig, null, 2)}
              </pre>
            </details>

            <details>
              <summary className="cursor-pointer text-blue-600 font-sans text-xs font-bold">Analytics Summary</summary>
              <pre className="text-[10px] mt-1 whitespace-pre-wrap break-all bg-gray-50 p-2 rounded">
                {JSON.stringify(diag.analytics, null, 2)}
              </pre>
            </details>
          </>
        ) : (
          <p>Collecting…</p>
        )}
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="card p-4">
          <h2 className="text-sm font-bold mb-2">Last Test Result</h2>
          <pre className="text-[10px] font-mono whitespace-pre-wrap break-all bg-gray-50 p-2 rounded max-h-80 overflow-auto">
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Help text */}
      <div className="card p-4 text-xs text-gray-600 space-y-1">
        <p className="font-bold">Troubleshooting checklist:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Permission must be <span className="font-bold">granted</span>.</li>
          <li>Opted In must be <span className="font-bold">true</span> — if not, tap Check Push Permission.</li>
          <li>Subscription ID must not be <span className="font-bold">none</span>.</li>
          <li>External ID must match your signed-in email (lowercase).</li>
          <li>OneSignal dashboard → Audience → Subscriptions: search the external ID above.</li>
          <li>If 0 recipients reported by Send Test, the SDK didn’t complete optIn or your email isn’t the linked external_id.</li>
        </ul>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  good,
  copyable,
}: {
  label: string;
  value: string;
  good?: boolean;
  copyable?: boolean;
}) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {}
  };
  const color =
    good === undefined ? "text-gray-800" : good ? "text-emerald-600" : "text-amber-600";
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-gray-400">{label}</span>
      <span className={`${color} text-right break-all max-w-[60%]`}>
        {value}
        {copyable && value && value !== "none" && value !== "n/a" && (
          <button onClick={handleCopy} className="ml-2 text-blue-500 underline text-[10px]">
            copy
          </button>
        )}
      </span>
    </div>
  );
}
