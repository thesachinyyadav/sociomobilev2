"use client";

/**
 * Developer Tools → Test Notifications (VAPID Edition)
 * ─────────────────────────────────────────────────────────────
 * Full-fidelity diagnostic surface for the SOCIO VAPID push pipeline.
 * Exposes:
 *   • Send Test Notification (direct device delivery via /notifications/send-direct)
 *   • Check Push Permission
 *   • Check VAPID Subscription details
 *   • Show Push Token (endpoint URI)
 *   • Force Re-register Service Worker
 *   • Trigger Local Notification
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
import { getNotificationAnalyticsSummary } from "@/lib/notificationAnalytics";

interface Diagnostic {
  appVersion: string;
  platform: string;
  isNative: boolean;
  permission: string;
  subscriptionEndpoint: string;
  subscriptionCreatedAt: string;
  subscriptionKeys: any;
  serviceWorkers: string[];
  swScope: string[];
  origin: string;
  isSecureContext: boolean;
  lastHydration: string;
  analytics: ReturnType<typeof getNotificationAnalyticsSummary> | null;
  serverConfig: any;
  collectedAt: string;
  userEmail: string;
  nativePushPermission?: boolean;
  nativeTorchAvailable?: boolean;
}

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
const LS_LAST_NOTIF_KEY = "socio_last_notif_received";

export default function DiagnosticsPage() {
  const { userData } = useAuth();
  const { enablePushNotifications, refresh } = useNotifications();
  const [diag, setDiag] = useState<Diagnostic | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [nativeTorchEnabled, setNativeTorchEnabled] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);

  const collect = useCallback(async () => {
    let permission = "n/a";
    let subEndpoint = "none";
    let subCreatedAt = "n/a";
    let subKeys = null;
    const swList: string[] = [];
    const swScope: string[] = [];
    let serverConfig: any = null;
    let nativePushPermission = false;
    let nativeTorchAvailable = false;

    try {
      if (typeof Notification !== "undefined") permission = Notification.permission;
    } catch {}

    try {
      if (typeof window !== "undefined") {
        const cachedSub = localStorage.getItem("socio_vapid_subscription");
        if (cachedSub) {
          const parsed = JSON.parse(cachedSub);
          subEndpoint = parsed.endpoint || "none";
          subKeys = parsed.keys || null;
        }
        subCreatedAt = localStorage.getItem("socio_vapid_subscription_created_at") || "n/a";
      }
    } catch (e) {
      console.warn("[Diagnostics] Subscription read failed", e);
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

    if (Capacitor.isNativePlatform()) {
      try {
        const { getNativePushPermissionState } = await import("@/lib/nativeOneSignal");
        nativePushPermission = await getNativePushPermissionState();
      } catch (e) {
        console.warn("[Diagnostics] Native push status query failed", e);
      }
      try {
        const { Torch } = await import("@capawesome/capacitor-torch");
        const { available } = await Torch.isAvailable();
        nativeTorchAvailable = available;
      } catch (e) {
        console.warn("[Diagnostics] Native torch query failed", e);
      }
    }

    setDiag({
      appVersion: APP_VERSION,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      permission,
      subscriptionEndpoint: subEndpoint,
      subscriptionCreatedAt: subCreatedAt,
      subscriptionKeys: subKeys,
      serviceWorkers: swList,
import { APP_URL } from "@/lib/apiConfig";

// Add APP_URL usage to origin
      swScope,
      origin: typeof window !== "undefined" ? APP_URL : "ssr",
      isSecureContext: typeof window !== "undefined" ? window.isSecureContext : false,
      lastHydration: new Date().toLocaleString(),
      analytics: getNotificationAnalyticsSummary(),
      serverConfig,
      collectedAt: new Date().toISOString(),
      userEmail: userData?.email || "(signed out)",
      nativePushPermission,
      nativeTorchAvailable,
    });
  }, [userData?.email]);

  const handleTestCamera = async () => {
    setBusy("camera");
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt
      });
      setCapturedPhotoUri(image.webPath || image.path || null);
      toast.success("Camera photo captured successfully!");
    } catch (e: any) {
      if (e?.message !== "User cancelled photos app") {
        toast.error(e?.message || "Camera test failed");
      }
      console.warn("[Diagnostics] Camera capture failed", e);
    } finally {
      setBusy(null);
    }
  };

  const handleToggleTorch = async () => {
    setBusy("torch");
    try {
      const { Torch } = await import("@capawesome/capacitor-torch");
      const { available } = await Torch.isAvailable();
      if (!available) {
        toast.error("Torch is not available on this device");
        return;
      }
      const newState = !nativeTorchEnabled;
      if (newState) {
        await Torch.enable();
      } else {
        await Torch.disable();
      }
      setNativeTorchEnabled(newState);
      toast.success(newState ? "Torch enabled!" : "Torch disabled!");
    } catch (e: any) {
      toast.error(e?.message || "Torch toggle failed");
      console.warn("[Diagnostics] Torch toggle failed", e);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    collect();
  }, [collect]);

  const handleSendTest = async () => {
    setBusy("test");
    try {
      const cachedSub = localStorage.getItem("socio_vapid_subscription");
      if (!cachedSub) {
        toast.error("Please enable notifications first to create a local subscription.");
        return;
      }
      
      const payload = {
        title: "VAPID Direct Test 🧪",
        body: `Testing direct web push notification delivery. Fired at ${new Date().toLocaleTimeString()}`,
        url: "/profile/settings/diagnostics",
      };

      const result = await apiRequest<any>("/notifications/send-direct", {
        method: "POST",
        body: JSON.stringify({
          subscription: JSON.parse(cachedSub),
          payload,
          delayMs: 3000,
        }),
      });

      setLastResult(result);
      if (result?.ok) {
        toast.success("Test notification scheduled! Close/minimize the app to see it pop up in 3 seconds.");
      } else {
        toast.error(`Push dispatch failed: ${result?.error || "Unknown error"}`);
      }
      refresh();
      collect();
    } catch (e: any) {
      setLastResult({ error: e?.message, status: e?.status, body: e?.responseBody });
      toast.error(e?.message || "Direct test failed");
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
        await r.unregister();
        console.log("[Diagnostics] Unregistered SW:", r.scope);
      }
      
      // Register sw.js fresh
      const reg = await navigator.serviceWorker.register("/sw.js");
      console.log("[Diagnostics] SW registered:", reg.scope);
      toast.success("Service worker re-registered fresh!");
      setTimeout(() => collect(), 1500);
    } catch (e: any) {
      toast.error(e?.message || "Re-register failed");
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
          body: "Direct local notification from the service worker.",
          icon: "/applogo.png",
          tag: "socio-local-test",
        });
      } else {
        new Notification("🧪 Local Notification", {
          body: "Direct Notification API (fallback).",
        });
      }
      toast.success("Local notification triggered");
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
    diag.subscriptionEndpoint !== "none" &&
    diag.serviceWorkers.length > 0;

  return (
    <div className="pwa-page px-4 pb-[calc(var(--bottom-nav)+var(--safe-bottom)+96px)] pt-5 animate-fade-in space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-white">Developer Tools</h1>
          <p className="text-xs text-gray-400">VAPID notification diagnostics & test harness</p>
        </div>
        <div
          className={`text-[11px] font-bold px-2 py-1 rounded-full ${
            isHealthy ? "bg-emerald-500/25 text-emerald-400" : "bg-amber-500/25 text-amber-400"
          }`}
        >
          {isHealthy ? "Healthy" : "Needs attention"}
        </div>
      </header>

      {/* Quick actions */}
      <div className="card p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
        <h2 className="text-sm font-bold text-white mb-2">Tests & Utilities</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleSendTest} isLoading={busy === "test"} fullWidth>
            Send Direct Push
          </Button>
          <Button onClick={handleRequestPermission} isLoading={busy === "perm"} fullWidth variant="secondary">
            Request Permission
          </Button>
          <Button onClick={collect} fullWidth variant="outline">
            Refresh State
          </Button>
          <Button onClick={handleLocalNotification} isLoading={busy === "local"} fullWidth variant="outline">
            Local Notification
          </Button>
          <Button onClick={handleForceReregisterSW} isLoading={busy === "sw"} fullWidth variant="outline">
            Force Re-register SW
          </Button>
          <Button onClick={handleCopyReport} fullWidth variant="accent">
            Copy Diagnostics
          </Button>
        </div>
      </div>

      {/* Native Diagnostics Panel */}
      {diag?.isNative && (
        <div className="card p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            🤖 Native Capacitor Hardware Diagnostics
          </h2>
          
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleTestCamera} isLoading={busy === "camera"} fullWidth variant="primary">
              Test Native Camera
            </Button>
            <Button onClick={handleToggleTorch} isLoading={busy === "torch"} fullWidth variant={nativeTorchEnabled ? "accent" : "secondary"}>
              {nativeTorchEnabled ? "Disable Flashlight" : "Enable Flashlight"}
            </Button>
          </div>

          {capturedPhotoUri && (
            <div className="border border-slate-800 p-2 rounded-xl bg-slate-950 text-center space-y-2">
              <p className="text-[10px] text-slate-400 font-mono break-all">
                Captured URI: {capturedPhotoUri}
              </p>
              <div className="relative aspect-video max-w-xs mx-auto rounded-lg overflow-hidden border border-slate-850 bg-black">
                <img src={capturedPhotoUri} alt="Captured preview" className="w-full h-full object-cover" />
              </div>
              <Button onClick={() => setCapturedPhotoUri(null)} size="sm" variant="ghost">
                Clear Photo
              </Button>
            </div>
          )}

          <div className="text-xs font-mono text-slate-300 space-y-1 bg-slate-950/50 p-3 rounded-xl border border-slate-850">
            <Row label="Native Platform" value={diag.platform} />
            <Row label="OneSignal Push State" value={diag.nativePushPermission ? "Granted" : "Not Granted/Requested"} good={diag.nativePushPermission} />
            <Row label="Flashlight Available" value={diag.nativeTorchAvailable ? "Yes" : "No"} good={diag.nativeTorchAvailable} />
          </div>
        </div>
      )}

      {/* Live VAPID state */}
      <div className="card p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs font-mono text-slate-300">
        <h2 className="text-sm font-bold font-sans text-white mb-2">Live VAPID State</h2>
        {diag ? (
          <>
            <Row label="App Version" value={diag.appVersion} />
            <Row label="Platform" value={`${diag.platform}${diag.isNative ? " (native)" : " (web)"}`} />
            <Row label="Origin" value={diag.origin} />
            <Row label="Secure Context" value={String(diag.isSecureContext)} />
            <Row label="Permission" value={diag.permission} good={diag.permission === "granted"} />
            <Row label="Subscription" value={diag.subscriptionEndpoint !== "none" ? "Cached" : "None"} good={diag.subscriptionEndpoint !== "none"} />
            <Row label="Endpoint" value={diag.subscriptionEndpoint} copyable />
            <Row label="Created At" value={diag.subscriptionCreatedAt} />
            <Row label="User Email" value={diag.userEmail} />
            <Row label="Last Hydration" value={diag.lastHydration} />

            <details className="pt-2">
              <summary className="cursor-pointer text-blue-400 font-sans text-xs font-bold">Service Workers ({diag.serviceWorkers.length})</summary>
              <pre className="text-[10px] mt-1 whitespace-pre-wrap break-all bg-slate-950 p-2 rounded text-slate-400 border border-slate-850">
                {diag.serviceWorkers.length ? diag.serviceWorkers.join("\n") : "(none registered)"}
              </pre>
            </details>

            <details>
              <summary className="cursor-pointer text-blue-400 font-sans text-xs font-bold">Server Config</summary>
              <pre className="text-[10px] mt-1 whitespace-pre-wrap break-all bg-slate-950 p-2 rounded text-slate-400 border border-slate-850">
                {JSON.stringify(diag.serverConfig, null, 2)}
              </pre>
            </details>

            <details>
              <summary className="cursor-pointer text-blue-400 font-sans text-xs font-bold">Analytics Summary</summary>
              <pre className="text-[10px] mt-1 whitespace-pre-wrap break-all bg-slate-950 p-2 rounded text-slate-400 border border-slate-850">
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
        <div className="card p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <h2 className="text-sm font-bold text-white mb-2">Last Test Result</h2>
          <pre className="text-[10px] font-mono whitespace-pre-wrap break-all bg-slate-950 p-2 rounded max-h-80 overflow-auto text-slate-300 border border-slate-850">
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Help text */}
      <div className="card p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400 space-y-1">
        <p className="font-bold text-white">Troubleshooting checklist:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Permission must be <span className="font-bold text-emerald-400">granted</span>.</li>
          <li>Service worker must be registered and active (green prefix above).</li>
          <li>Subscription must show <span className="font-bold text-emerald-400">Cached</span>.</li>
          <li>If dispatch fails, verify server has valid <span className="font-mono">VAPID_PRIVATE_KEY</span> and public key config.</li>
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
    good === undefined ? "text-slate-300" : good ? "text-emerald-400" : "text-amber-400";
  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <span className="text-slate-500">{label}</span>
      <span className={`${color} text-right break-all max-w-[65%]`}>
        {value}
        {copyable && value && value !== "none" && value !== "n/a" && (
          <button onClick={handleCopy} className="ml-2 text-blue-400 underline text-[10px] cursor-pointer hover:text-blue-300">
            copy
          </button>
        )}
      </span>
    </div>
  );
}
