"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as jose from "jose";
import { useAuth, type VolunteerEvent } from "@/context/AuthContext";
import { useNetwork } from "@/context/NetworkContext";
import { useLoading } from "@/components/loading";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  QrCodeIcon,
  BellIcon,
  FlashlightIcon,
} from "@/components/icons";
import { getActiveVolunteerEvents } from "@/lib/volunteerAccess";
import { apiRequest } from "@/lib/apiClient";
import { formatDateShort, formatTime } from "@/lib/dateUtils";
import {
  getScanner,
  type IScanner,
  type ScannerResult,
} from "@/lib/ScannerService";
import { useNotifications } from "@/context/NotificationContext";
import { Capacitor } from "@capacitor/core";
import {
  showSuccessToast,
  showWarningToast,
  showErrorToast,
  showInfoToast,
} from "@/lib/toastUtils";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { startRecoveryTransition, stopRecoveryTransition } from "@/lib/nativeLaunchState";
import { logCapacitorPerfAudit, logMemorySnapshot, startPerfSpan, withPerfSpan } from "@/lib/capacitorPerfAudit";
import ScannerSkeleton from "@/components/skeletons/ScannerSkeleton";
import WebScanner from "./WebScanner";
import NativeScanner from "./NativeScanner";
import { db, syncEngine } from "@/lib/offline";
import { useLiveQuery } from "dexie-react-hooks";
import {
  buildTrustedTimeProvenance,
  decideOfflineScan,
  getTimeIntegrityReport,
  integrityLabel,
  type TimeIntegrityReport,
} from "@/lib/offlineTime";

const DENIED_MESSAGE = "You do not have permission to access this feature";

/** Hard cap on long-session memory growth for in-flight scan caches. */
const COOLDOWN_TTL_MS = 5 * 60_000;
const ATTENDEE_CACHE_MAX = 500;

/**
 * Cheap client-side QR shape check. Catches obvious garbage (empty,
 * wildly oversized, non-printable) before we burn a queue slot or a
 * network round-trip. The server remains authoritative on semantics.
 */
function isPlausibleScanPayload(raw: string): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed.length < 6 || trimmed.length > 2048) return false;
  // Reject ASCII control bytes (0x00-0x1F except tab/LF/CR) and DEL (0x7F).
  for (let j = 0; j < trimmed.length; j++) {
    const c = trimmed.charCodeAt(j);
    if (c === 9 || c === 10 || c === 13) continue;
    if (c < 32 || c === 127) return false;
  }
  return true;
}

type ScanStatus = "success" | "duplicate" | "error" | "unauthorized" | "offline";

interface ScanToast {
  id: string;
  type: ScanStatus;
  name: string;
  message: string;
  timestamp: Date;
  exiting?: boolean;
}

interface HistoryRow {
  id: string;
  name: string;
  status: ScanStatus;
  time: Date;
  qrData?: string;
}

/** Auto-dismiss durations per toast type (ms) */
const TOAST_MS: Record<ScanStatus, number> = {
  success:      1200,
  duplicate:    1800,
  error:        2000,
  unauthorized: 2000,
  offline:      2000,
};

const TOAST_ICON: Record<ScanStatus, string> = {
  success:      "✅",
  duplicate:    "⚠️",
  error:        "❌",
  unauthorized: "🚫",
  offline:      "📡",
};

function ScannerParticipantSheet({
  row,
  onClose,
  eventTitle,
}: {
  row: HistoryRow;
  onClose: () => void;
  eventTitle: string;
}) {
  const getBadgeClass = (status: ScanStatus) => {
    switch (status) {
      case "success": return "success";
      case "duplicate": return "duplicate";
      case "offline": return "offline";
      default: return "error";
    }
  };

  const getStatusLabel = (status: ScanStatus) => {
    switch (status) {
      case "success": return "Verified • Checked In";
      case "duplicate": return "Already checked in";
      case "offline": return "Pending Secure Sync";
      case "unauthorized": return "Not Assigned";
      default: return "Invalid Scan";
    }
  };

  return (
    <div className="participant-sheet-overlay" onClick={onClose}>
      <div className="participant-sheet" onClick={e => e.stopPropagation()}>
        <div className="participant-sheet-header">
          <div>
            <h3 className="participant-sheet-title">{row.name}</h3>
            <p className="participant-sheet-subtitle">{row.qrData || "No Registration ID"}</p>
          </div>
          <button className="participant-sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="participant-sheet-grid">
          <div className="participant-sheet-field">
            <span className="participant-sheet-label">Status</span>
            <div className={`participant-sheet-badge ${getBadgeClass(row.status)}`}>
              {TOAST_ICON[row.status]} {getStatusLabel(row.status)}
            </div>
          </div>
          
          <div className="participant-sheet-field">
            <span className="participant-sheet-label">Time</span>
            <span className="participant-sheet-value">
              {row.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>

          {/* Event spans full width to avoid truncation on long names */}
          <div className="participant-sheet-field" style={{ gridColumn: "1 / -1" }}>
            <span className="participant-sheet-label">Event</span>
            <span className="participant-sheet-value">{eventTitle}</span>
          </div>
          
          <div className="participant-sheet-field">
            <span className="participant-sheet-label">Date</span>
            <span className="participant-sheet-value">
              {row.time.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {row.qrData && row.qrData !== "No Registration ID" && (
            <div className="participant-sheet-field" style={{ gridColumn: "1 / -1" }}>
              <span className="participant-sheet-label">Registration ID</span>
              <span className="participant-sheet-value" style={{ fontSize: "12px", wordBreak: "break-all", color: "var(--color-text-muted)" }}>
                {row.qrData}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Auto-dismiss durations and icons are now managed by toastUtils

export default function ScannerClient() {
  const params  = useParams();
  const router  = useRouter();
  const eventId = String(params?.eventId || "");
  const { session, userData, isLoading: authLoading } = useAuth();
  const { status: networkStatus } = useNetwork();

  /* ── Access state ── */
  const [isChecking,   setIsChecking]   = useState(true);
  const [event,        setEvent]        = useState<VolunteerEvent | null>(null);
  const [accessError,  setAccessError]  = useState<string | null>(null);

  /* ── Scanner state ── */
  const [isScanning,   setIsScanning]   = useState(false);
  const [cameraError,  setCameraError]  = useState<string | null>(null);

  /* ── UX state ── */
  const { show: showGlobalLoader } = useLoading();
  const [mounted, setMounted] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [history,      setHistory]      = useState<HistoryRow[]>([]);
  
  useEffect(() => { setMounted(true); }, []);

  // Global loader effect
  useEffect(() => {
    if (isChecking && mounted) {
      const handle = showGlobalLoader({
        id: "scanner-prepare",
        kind: "panel",
        operation: "scanner.prepare",
        blocking: true,
      });
      return () => handle.done();
    }
  }, [isChecking, mounted, showGlobalLoader]);
  const [selectedRow,  setSelectedRow]  = useState<HistoryRow | null>(null);
  const [scanCount,    setScanCount]    = useState(0);
  const [viewportStatus, setViewportStatus] = useState<"idle"|"success"|"duplicate"|"error">("idle");
  const [integrity,    setIntegrity]    = useState<TimeIntegrityReport | null>(null);
  const { unreadCount } = useNotifications();
  const [isViewingAll, setIsViewingAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  // Dexie live queries
  const syncQueue = useLiveQuery(
    () => db.syncQueue.where("eventId").equals(eventId).toArray(),
    [eventId]
  ) || [];

  /* ── Refs ── */
  const videoRef          = useRef<HTMLVideoElement | null>(null);
  const scannerRef        = useRef<IScanner | null>(null);
  const cooldownMapRef    = useRef<Map<string, number>>(new Map());
  const attendeeCacheRef  = useRef<Map<string, { name: string; status: string }>>(new Map());
  const viewportTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef        = useRef(true);
  // Stable handler the scanner subscribes to. We mutate this ref's callback when
  // dependencies change so the scanner itself never needs to remount.
  const processScanRef    = useRef<(result: ScannerResult) => void>(() => {});
  // Live snapshot of the NetworkContext status so processScan can read it without
  // becoming a new function every time the network state changes.
  const networkStatusRef  = useRef(networkStatus);
  networkStatusRef.current = networkStatus;

  const torchEnabledRef   = useRef(torchEnabled);
  useEffect(() => {
    torchEnabledRef.current = torchEnabled;
  }, [torchEnabled]);

  const isNative = useMemo(() => Capacitor.isNativePlatform(), []);

  const cachedEvent = useMemo(() =>
    // Filter via trusted "now" so a tampered device clock cannot promote
    // an already-expired cached assignment back into the active set.
    getActiveVolunteerEvents(
      userData?.volunteerEvents,
      new Date(getTimeIntegrityReport().trustedNowMs),
    ).find((e) => e.event_id === eventId) ?? null,
  [eventId, userData?.volunteerEvents]);

  const headerMetadata = useMemo(() => {
    if (!event) return [] as string[];

    return [
      formatDateShort(event.event_date),
      event.event_time ? formatTime(event.event_time) : "Time TBD",
      event.venue || event.campus_hosted_at || "Venue TBD",
    ];
  }, [event]);

  /* ── Component Lifecycle ── */
  useEffect(() => {
    mountedRef.current = true;
    syncEngine.start();
    return () => {
      mountedRef.current = false;
      if (viewportTimerRef.current) clearTimeout(viewportTimerRef.current);
      // Recovery transitions and memory snapshots are native-only signals
      if (isNative) {
        stopRecoveryTransition("scanner-verify");
        logMemorySnapshot("scanner-unmount");
      }
    };
  }, [isNative]);

  /* ── Time-integrity poll ──
   * The integrity monitor compares device time against the trusted server
   * anchor and surfaces tampering/drift before it can affect a scan.
   * Polling at 5s keeps the banner reactive without measurable CPU cost. */
  useEffect(() => {
    if (!mountedRef.current) return;
    setIntegrity(getTimeIntegrityReport());
    const id = setInterval(() => {
      if (!mountedRef.current) return;
      setIntegrity(getTimeIntegrityReport());
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  /* ── UX & Toast system ── */
  const pushToast = useCallback((t: { type: "success" | "duplicate" | "error" | "unauthorized" | "offline", name: string, message: string }) => {
    const opts = { title: t.name, message: t.message };
    switch (t.type) {
      case "success":
        showSuccessToast(opts);
        break;
      case "duplicate":
        showWarningToast(opts);
        break;
      case "offline":
        showInfoToast(opts);
        break;
      case "unauthorized":
      case "error":
        showErrorToast(opts);
        break;
    }
  }, []);

  const flashViewport = useCallback((s: "success" | "duplicate" | "error") => {
    setViewportStatus(s);
    if (viewportTimerRef.current) clearTimeout(viewportTimerRef.current);
    viewportTimerRef.current = setTimeout(() => setViewportStatus("idle"), 500);
  }, []);

  /* ── Haptics ── */
  const haptic = useCallback(async (type: "success" | "warning" | "error") => {
    if (isNative) {
      try {
        await Haptics.notification({
          type: type === "success" ? NotificationType.Success
              : type === "warning" ? NotificationType.Warning
              : NotificationType.Error,
        });
      } catch {}
    } else if ("vibrate" in navigator) {
      navigator.vibrate(type === "success" ? [70] : [50, 40, 50]);
    }
  }, [isNative]);

  /* ── Camera controls ── */
  const stopScanner = useCallback(async () => {
    const end = startPerfSpan("scanner.client.stop");
    try {
      if (scannerRef.current) {
        if (torchEnabledRef.current) {
          await scannerRef.current.setTorch(false).catch(() => {});
          setTorchEnabled(false);
        }
        await scannerRef.current.stop();
      }
      setTorchAvailable(false);
      // barcode-scanner-active is a native-only class (CapacitorScanner sets it);
      // removing it on web is a safe no-op but we isolate it for clarity
      if (isNative) {
        document.body.classList.remove("barcode-scanner-active");
        document.documentElement.classList.remove("barcode-scanner-active");
      }
      // Web: always clean up video stream to release camera resource
      if (!isNative && videoRef.current) {
        try {
          const stream = videoRef.current.srcObject as MediaStream;
          stream?.getTracks().forEach(t => t.stop());
          videoRef.current.srcObject = null;
        } catch (e) {
          console.error(`[ScannerCleanup] Error releasing video stream:`, e);
        }
      }
    } catch (err) {
      console.error(`[ScannerCleanup] Scanner stop error:`, err);
    } finally {
      setIsScanning(false);
      end({ status: "completed" });
    }
  }, [isNative]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !torchAvailable || !isNative) return;
    try {
      const newState = !torchEnabled;
      await scannerRef.current.setTorch(newState);
      setTorchEnabled(newState);
      
      // Haptic feedback for professional operational feel
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

      showInfoToast({
        title: "Torch",
        message: newState ? "Flashlight active" : "Flashlight inactive"
      });
    } catch (err) {
      console.error("[Scanner] Torch toggle failed:", err);
    }
  }, [torchEnabled, torchAvailable, isNative]);

  /* ── Core scan processor (backend-authoritative) ── */
  const processScan = useCallback(async (result: ScannerResult) => {
    if (!session?.access_token || !event) return;

    const qrData = result.data;

    // Cheap local rejection of obvious garbage — saves a queue slot or a
    // POST round-trip before any further work. Server stays authoritative
    // on semantics; we only filter shape.
    if (!isPlausibleScanPayload(qrData)) {
      void haptic("error");
      flashViewport("error");
      pushToast({ type: "error", name: "Invalid QR", message: "QR not recognized" });
      return;
    }

    // Time-integrity gate (Phases 3, 4, 5, 9). The integrity report drives
    // the trusted "now" we use for cooldown, expiry, and event-window checks.
    // We pre-compute it once per scan so the cooldown and the validator see
    // a consistent snapshot.
    const report = getTimeIntegrityReport();
    const decision = decideOfflineScan(event, { integrity: report });

    let effectiveRegistrationId = qrData;
    let isJwt = false;

    // JWT Verification Flow
    if (qrData.startsWith('eyJ') && qrData.split('.').length === 3) {
      isJwt = true;
      try {
        const jose = await import("jose");
        const decoded = jose.decodeJwt(qrData);
        
        // 1. Verify Expiry
        if (decoded.exp && (decoded.exp * 1000) < Date.now()) {
          void haptic("error");
          flashViewport("error");
          pushToast({ type: "error", name: "Expired Pass", message: "This pass has expired" });
          return;
        }

        // 2. Verify Event
        if (decoded.eventId && decoded.eventId !== event.event_id) {
          void haptic("error");
          flashViewport("error");
          pushToast({ type: "error", name: "Wrong Event", message: "Pass is for a different event" });
          return;
        }

        // 3. Extract actual registration ID for backend
        if (decoded.registrationId) {
          effectiveRegistrationId = String(decoded.registrationId);
        }
      } catch (err) {
        console.warn("JWT Decode failed, falling back to raw payload", err);
      }
    }

    const now = report.trustedNowMs;
    const last = cooldownMapRef.current.get(effectiveRegistrationId);
    if (last && now - last < 2500) return;
    cooldownMapRef.current.set(effectiveRegistrationId, now);

    // Opportunistically prune entries older than COOLDOWN_TTL_MS so long shifts
    // don't grow the Map unbounded. Runs O(n) only when the map crosses a soft
    // threshold so the scan path stays hot.
    if (cooldownMapRef.current.size > 200) {
      const cutoff = now - COOLDOWN_TTL_MS;
      for (const [key, ts] of cooldownMapRef.current) {
        if (ts < cutoff) cooldownMapRef.current.delete(key);
      }
    }

    const liveStatus = networkStatusRef.current;
    const isActuallyOffline = !navigator.onLine || liveStatus === "offline" || liveStatus === "reconnecting";

    if (!decision.allow) {
      // If offline, we MUST block.
      // If online, we only block if it's a hard business logic rejection (not started / closed).
      // We do NOT block online scans for technical time-sync issues (no-anchor / compromised)
      // because the server is the authoritative clock during live verification.
      const isTechnicalBlock =
        decision.reason === "no-trusted-time" ||
        decision.reason === "time-compromised" ||
        decision.reason === "anchor-expired";

      if (isActuallyOffline || !isTechnicalBlock) {
        void haptic("error");
        flashViewport("error");
        pushToast({
          type:
            decision.reason === "assignment-expired" ||
            decision.reason === "event-window-closed" ||
            decision.reason === "event-not-started"
              ? "unauthorized"
              : "error",
          name: "Cannot scan",
          message: decision.message,
        });
        return;
      }
    }

    const cached = attendeeCacheRef.current.get(effectiveRegistrationId);
    const cachedAttendee = await db.attendees.get(effectiveRegistrationId);
    if (cached?.status === "already_present" || cachedAttendee?.status === "already_present") {
      void haptic("warning");
      flashViewport("duplicate");
      pushToast({ type: "duplicate", name: cachedAttendee?.name || cached?.name || "Attendee", message: "Already checked in" });
      return;
    }

    const provenance = buildTrustedTimeProvenance(report);
    const scannerInfo = {
      source:    "sociomobilev2",
      platform:  Capacitor.getPlatform(),
      format:    result.format,
      timestamp: new Date().toISOString(),
      // Trusted-time fields travel with every scan (online + offline) so the
      // server can reconcile against its own clock (Phase 7).
      trustedTime: provenance,
    };
    
    // For wallet JWTs, we could optionally send the whole JWT to a new endpoint, 
    // but to preserve scanner compatibility we pass the effective registration ID.
    const payload = {
      qrCodeData: effectiveRegistrationId,
      originalJwt: isJwt ? qrData : undefined,
      volunteerId: userData?.register_number,
      scannerInfo,
    };

    // Recovery transition is a native-only overlay signal — never dispatch on web/PWA
    const recoveryTimer = isNative
      ? setTimeout(() => startRecoveryTransition("Verifying attendee…", "scanner-verify"), 700)
      : null;

    try {
      let res: any;
      if (isActuallyOffline) {
        // ONLINE ONLY POLICY ENFORCEMENT
        // We explicitly do not queue scans offline for volunteers at this stage.
        throw new Error("Scanner requires internet connection.");
      } else {
        res = await withPerfSpan("scanner.verify.request", async () =>
          apiRequest(
            `/events/${encodeURIComponent(event.event_id)}/scan-qr`,
            { method: "POST", body: JSON.stringify(payload), cache: "no-store", timeoutMs: 4000 }
          ), { eventId: event.event_id }
        );
      }

      if (recoveryTimer) clearTimeout(recoveryTimer);
      if (isNative) stopRecoveryTransition("scanner-verify");

      if (!isActuallyOffline) {
        const participant = res.participant;
        const finalName   = participant?.name || "Attendee";
        const rememberAttendee = () => {
          // Bound the in-memory attendee cache. JS Map preserves insertion order
          // so we evict the oldest entry when we cross the cap.
          if (attendeeCacheRef.current.size >= ATTENDEE_CACHE_MAX) {
            const oldest = attendeeCacheRef.current.keys().next().value;
            if (oldest !== undefined) attendeeCacheRef.current.delete(oldest);
          }
          attendeeCacheRef.current.set(effectiveRegistrationId, { name: finalName, status: "already_present" });
        };

        if (participant?.status === "already_present") {
          void haptic("warning");
          flashViewport("duplicate");
          rememberAttendee();
          await db.attendees.put({ qrData: effectiveRegistrationId, eventId: event.event_id, name: finalName, status: "already_present", synced: true, updatedAt: Date.now() });
          pushToast({ type: "duplicate", name: finalName, message: "Already checked in" });
          setHistory(prev => [{ id: `r_${Date.now()}`, name: finalName, status: "duplicate" as ScanStatus, time: new Date(), qrData: effectiveRegistrationId }, ...prev].slice(0, 50));
        } else {
          void haptic("success");
          flashViewport("success");
          rememberAttendee();
          await db.attendees.put({ qrData: effectiveRegistrationId, eventId: event.event_id, name: finalName, status: "already_present", synced: true, updatedAt: Date.now() });
          pushToast({ type: "success", name: finalName, message: "Attendance marked" });
          setHistory(prev => [{ id: `r_${Date.now()}`, name: finalName, status: "success" as ScanStatus, time: new Date(), qrData: effectiveRegistrationId }, ...prev].slice(0, 50));
          setScanCount(prev => prev + 1);
        }
      }
    } catch (err: any) {
      if (recoveryTimer) clearTimeout(recoveryTimer);
      if (isNative) stopRecoveryTransition("scanner-verify");
      console.error(`[ScannerError] processScan failure:`, err);
      const msg = (err.message || "").toLowerCase();
      const isNetworkError = msg.includes("network") || msg.includes("fetch") || err.name === "TimeoutError";
      const isUnauthorized = err.status === 403 || err.status === 429;

      if (isNetworkError) {
        void haptic("error");
        flashViewport("error");
        pushToast({ type: "error", name: "Offline", message: "Scanner requires internet connection" });
        setTimeout(() => stopScanner(), 500);
      } else if (isUnauthorized) {
        void haptic("error");
        flashViewport("error");
        pushToast({ type: "unauthorized", name: "Not assigned", message: "You are not assigned to this event" });
      } else {
        void haptic("error");
        flashViewport("error");
        pushToast({ type: "error", name: "Invalid QR", message: err.message || "QR not recognized" });
      }
    } finally {
      if (isNative) stopRecoveryTransition("scanner-verify");
    }
  }, [session, event, userData, isNative, haptic, flashViewport, pushToast]);

  // Keep the ref aligned with the latest closure so the scanner can call a stable
  // identity. This decouples scanner lifecycle from React closures.
  useEffect(() => {
    processScanRef.current = (r) => void processScan(r);
  }, [processScan]);

  const startScanner = useCallback(async () => {
    if (!isNative && !videoRef.current) return;
    setCameraError(null);
    try {
      await withPerfSpan("scanner.client.start", async () => {
        if (scannerRef.current && isScanning) await stopScanner();
        if (!scannerRef.current) scannerRef.current = getScanner();
        let perm = await scannerRef.current.checkPermission();
        if (perm !== "granted") {
          perm = await scannerRef.current.requestPermission();
          if (perm !== "granted") throw new Error("Camera permission required");
        }
        // Stable ref-based dispatch — the scanner never sees a new function,
        // so library-internal teardown/setup is never triggered by React renders.
        await scannerRef.current.start(videoRef.current as any, (r) => processScanRef.current(r));
        if (isNative) {
          const available = await scannerRef.current.isTorchAvailable();
          setTorchAvailable(available);
        } else {
          setTorchAvailable(false);
        }
      }, { isNative });
      setIsScanning(true);
      // Memory snapshot is dev/native diagnostic only — no-op in production web
      if (isNative) logMemorySnapshot("scanner-started");
    } catch (err: any) {
      setIsScanning(false);
      console.error(`[ScannerError] Scanner start error:`, err);

      const rawMsg = (err.message || "").toLowerCase();
      let safeMsg = "Camera access required";

      if (rawMsg.includes("permission") || rawMsg.includes("denied")) {
        safeMsg = "Camera permission denied. Please enable it in settings.";
      } else if (rawMsg.includes("not supported") || rawMsg.includes("unsupported")) {
        safeMsg = "Scanner not supported on this device.";
      } else if (rawMsg.includes("installed") || rawMsg.includes("module")) {
        safeMsg = "Initializing scanner…";
      } else if (rawMsg.trim() !== "") {
        safeMsg = "Failed to start scanner. Please try again.";
      }

      setCameraError(safeMsg);
      await stopScanner();
    }
  }, [isNative, isScanning, stopScanner]);

  useEffect(() => {
    let appStateHandle: { remove: () => Promise<void> } | null = null;

    // visibilitychange fires on both web and native — stop scanner when hidden
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isScanning) {
        void stopScanner();
        // Perf audit logging is native/dev diagnostic only
        if (isNative) logCapacitorPerfAudit("scanner.lifecycle.visibility-hidden-stop");
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    // App background detection is native-only (Capacitor App API)
    if (isNative) {
      void (async () => {
        try {
          const { App } = await import("@capacitor/app");
          appStateHandle = await App.addListener("appStateChange", ({ isActive }) => {
            if (!isActive && isScanning) {
              void stopScanner();
              logCapacitorPerfAudit("scanner.lifecycle.app-background-stop");
            }
          });
        } catch (error) {
          console.warn("[ScannerLifecycle] App state listener unavailable:", error);
        }
      })();
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (appStateHandle) {
        appStateHandle.remove().catch(() => {});
      }
    };
  }, [isNative, isScanning, stopScanner]);

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !session) router.replace("/auth");
  }, [authLoading, router, session]);

  /* ── Access validation ──
   * The backend /volunteer/events/:eventId/access endpoint is the ONLY authority.
   * - On 403/auth error → block scanner unconditionally
   * - On genuine network error → allow cached event as best-effort fallback
   * - Scanner NEVER opens until this resolves successfully
   */
  useEffect(() => {
    if (authLoading) return;
    
    if (!eventId || !session?.access_token) {
      setIsChecking(false);
      setAccessError(DENIED_MESSAGE);
      router.replace("/volunteer");
      return;
    }

    let cancelled = false;
    setIsChecking(true);
    setAccessError(null);

    async function validate() {
      const endValidateSpan = startPerfSpan("scanner.access-validate", { eventId });
      try {
        const res: any = await apiRequest(
          `/volunteer/events/${encodeURIComponent(eventId)}/access`,
          { cache: "no-store" }
        );
        if (cancelled) return;
        if (res.authorized === false) {
          setEvent(null);
          setAccessError(res.error || DENIED_MESSAGE);
          pushToast({ type: "error", name: "Access Denied", message: res.error || DENIED_MESSAGE });
          setTimeout(() => router.replace("/volunteer"), 1500);
          return;
        }
        // Backend confirmed — use backend event data (most up-to-date)
        setEvent(res.event || cachedEvent);
      } catch (err: any) {
        console.error(`[Scanner] Access validation failed:`, err?.message || err);
        if (cancelled) return;
        const msg = (err.message || "").toLowerCase();
        
        const isNetworkError =
          msg.includes("network") ||
          msg.includes("fetch") ||
          err.name === "TimeoutError" ||
          err.name === "AbortError";
          
        const isAuthError =
          msg.includes("not assigned") ||
          msg.includes("volunteer access") ||
          msg.includes("archived") ||
          msg.includes("register") ||
          err.status === 401 ||
          err.status === 403;

        if (isAuthError) {
          // Hard block — backend explicitly denied access
          setEvent(null);
          setAccessError(err.message || DENIED_MESSAGE);
          pushToast({ type: "error", name: "Access Denied", message: err.message || DENIED_MESSAGE });
          setTimeout(() => router.replace("/volunteer"), 1500);
        } else if (isNetworkError) {
          // ONLINE ONLY POLICY ENFORCEMENT
          setEvent(null);
          const fallbackMsg = "Scanner requires an active internet connection. Please reconnect.";
          setAccessError(fallbackMsg);
          pushToast({ type: "error", name: "Offline", message: fallbackMsg });
          setTimeout(() => router.replace("/volunteer"), 2000);
        } else {
          // Unknown error without cache — deny for safety
          setEvent(null);
          const fallbackMsg = "Could not verify your assignment. Please try again.";
          setAccessError(fallbackMsg);
          pushToast({ type: "error", name: "Error", message: fallbackMsg });
          setTimeout(() => router.replace("/volunteer"), 1500);
        }
      } finally {
        if (!cancelled) setIsChecking(false);
        endValidateSpan({ status: cancelled ? "cancelled" : "completed" });
      }
    }
    void validate();
    return () => { cancelled = true; };
  }, [cachedEvent, eventId, authLoading, session, pushToast, router]);

  /* ── Restore session history ── */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`scan_hist_${eventId}`);
      if (raw) {
        const rows: HistoryRow[] = JSON.parse(raw).map((r: any) => ({
          ...r,
          time:   new Date(r.time),
          status: r.status as ScanStatus,
        }));
        setHistory(rows);
        setScanCount(rows.filter(r => r.status === "success").length);
        rows.forEach(r => {
          if (r.status === "success" || r.status === "duplicate") {
            attendeeCacheRef.current.set(r.id, { name: r.name, status: "already_present" });
          }
        });
      }
    } catch {}
  }, [eventId]);

  useEffect(() => {
    if (history.length > 0)
      sessionStorage.setItem(`scan_hist_${eventId}`, JSON.stringify(history));
  }, [history, eventId]);

  /* ── Scanner lifecycle ── */
  useEffect(() => {
    if (isChecking || !event || accessError) return;

    let initTimer: any;
    const initScanner = () => {
      try {
        scannerRef.current = getScanner();
        void scannerRef.current.checkPermission();
      } catch (err) {
        console.error(`[Scanner] Initialization failed on mount:`, err);
      }
    };

    // Defer initialization to avoid blocking the main thread during hydration/skeleton paint
    if (typeof requestIdleCallback !== "undefined") {
      initTimer = requestIdleCallback(initScanner, { timeout: 2000 });
    } else {
      initTimer = setTimeout(initScanner, 200);
    }

    return () => {
      if (typeof cancelIdleCallback !== "undefined" && typeof initTimer === "number") {
        cancelIdleCallback(initTimer);
      } else {
        clearTimeout(initTimer);
      }
      void stopScanner();
    };
  }, [isChecking, event, accessError, stopScanner]);


  /* ── Loading / Error guards ── */
  if (authLoading || isChecking) {
    return <ScannerSkeleton />;
  }

  if (!event || accessError) {
    return (
      <div className="pwa-page-center bg-[var(--color-bg)] px-4">
        <div className="text-center max-w-[300px]">
          <div className="h-12 w-12 mx-auto mb-3 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangleIcon size={28} className="text-[var(--color-danger)]" />
          </div>
          <h1 className="text-[16px] font-bold text-[var(--color-text)]">Access restricted</h1>
          <p className="mt-2 text-[13px] text-[var(--color-text-muted)] leading-relaxed">
            {accessError || "You don't have access to scan this event."}
          </p>
          <button
            onClick={() => router.replace("/volunteer")}
            className="btn btn-primary w-full mt-4 text-sm"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const renderHistoryModal = () => (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col pwa-safe-top">
      <header className="flex items-center justify-between px-4 h-[var(--nav-height)] border-b border-[#F1F5F9]">
        <button onClick={() => setIsViewingAll(false)} className="p-2 -ml-2 text-[#0F172A]">
          <ArrowLeftIcon size={20} />
        </button>
        <h2 className="text-[16px] font-bold text-[#0F172A]">All Scans</h2>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-1">
          {history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(row => {
            const getInitials = (name: string) => {
              const parts = name.trim().split(' ');
              if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
              return name.substring(0, 2).toUpperCase();
            };

            const statusLabel =
              row.status === "success" ? "Verified" :
              row.status === "duplicate" ? "Recheck" :
              row.status === "offline" ? "Pending" :
              row.status === "unauthorized" ? "Not assigned" :
              "Error";

            const statusIcon =
              row.status === "success" ? "✓" :
              row.status === "duplicate" ? "!" :
              row.status === "offline" ? "↑" :
              "✕";

            return (
              <div key={row.id} className="flex items-center justify-between py-3 border-b border-[#F8FAFC] last:border-0" onClick={() => setSelectedRow(row)}>
                <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0 ${row.status === 'success' ? 'bg-[#D1FAE5] text-[#10B981]' : row.status === 'duplicate' ? 'bg-[#FEF3C7] text-[#F59E0B]' : row.status === 'error' ? 'bg-[#FEE2E2] text-[#EF4444]' : 'bg-[#E0E7FF] text-[#3B82F6]'}`}>
                    {getInitials(row.name)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-[#0F172A] truncate">{row.name}</span>
                    <span className="text-[12px] font-medium text-[#64748B]">{row.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold ${row.status === 'success' ? 'bg-[#D1FAE5] text-[#10B981]' : row.status === 'duplicate' ? 'bg-[#FEF3C7] text-[#F59E0B]' : row.status === 'error' ? 'bg-[#FEE2E2] text-[#EF4444]' : 'bg-[#E0E7FF] text-[#3B82F6]'}`}>
                  {statusIcon} {statusLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Controls */}
      {history.length > ITEMS_PER_PAGE && (
        <div className="p-4 border-t border-[#F1F5F9] bg-white flex items-center justify-between">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-4 py-2 text-[13px] font-bold text-[#011F7B] disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-2"
          >
            <ArrowLeftIcon size={14} /> Previous
          </button>
          <span className="text-[13px] font-bold text-[#64748B]">
            Page {currentPage} of {Math.ceil(history.length / ITEMS_PER_PAGE)}
          </span>
          <button 
            disabled={currentPage >= Math.ceil(history.length / ITEMS_PER_PAGE)}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="px-4 py-2 text-[13px] font-bold text-[#011F7B] disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-2"
          >
            Next <ArrowLeftIcon size={14} className="rotate-180" />
          </button>
        </div>
      )}
    </div>
  );

  /* ── Main render ── */
  if (isNative) {
    return (
      <>
        <NativeScanner
          event={event}
          scanCount={scanCount}
          history={history}
          isScanning={isScanning}
          cameraError={cameraError}
          viewportStatus={viewportStatus}
          syncQueueLength={syncQueue.length}
          startScanner={startScanner}
          stopScanner={stopScanner}
          setIsViewingAll={setIsViewingAll}
          torchAvailable={torchAvailable}
          torchEnabled={torchEnabled}
          toggleTorch={toggleTorch}
          router={router}
          setSelectedRow={setSelectedRow}
          userData={userData}
          session={session}
          unreadCount={unreadCount}
          integrity={integrity}
          integrityLabel={integrityLabel}
          imgError={imgError}
          setImgError={setImgError}
        />
        {selectedRow && (
          <ScannerParticipantSheet row={selectedRow} eventTitle={event.title} onClose={() => setSelectedRow(null)} />
        )}
        {isViewingAll && renderHistoryModal()}
      </>
    );
  }

  return (
    <>
      <WebScanner
        event={event}
        scanCount={scanCount}
        history={history}
        isScanning={isScanning}
        cameraError={cameraError}
        videoRef={videoRef}
        viewportStatus={viewportStatus}
        syncQueueLength={syncQueue.length}
        startScanner={startScanner}
        stopScanner={stopScanner}
        setIsViewingAll={setIsViewingAll}
        userData={userData}
        session={session}
        unreadCount={unreadCount}
        integrity={integrity}
        integrityLabel={integrityLabel}
        router={router}
        imgError={imgError}
        setImgError={setImgError}
        setSelectedRow={setSelectedRow}
      />
      {selectedRow && (
        <ScannerParticipantSheet row={selectedRow} eventTitle={event.title} onClose={() => setSelectedRow(null)} />
      )}
      {isViewingAll && renderHistoryModal()}
    </>
  );
}

