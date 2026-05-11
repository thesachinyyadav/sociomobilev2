"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth, type VolunteerEvent } from "@/context/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import { Button } from "@/components/Button";
import { 
  AlertTriangleIcon, 
  ArrowLeftIcon, 
  QrCodeIcon, 
  ShieldCheckIcon,
  CheckCircleIcon,
  XIcon,
  CameraIcon
} from "@/components/icons";
import { getActiveVolunteerEvents } from "@/lib/volunteerAccess";
import { apiRequest } from "@/lib/apiClient";
import { getScanner, IScanner, ScannerResult, PermissionStatus } from "@/lib/ScannerService";
import { Capacitor } from "@capacitor/core";
import { Haptics, NotificationType } from "@capacitor/haptics";
import { AnimatePresence, motion } from "framer-motion";

const DENIED_MESSAGE = "You do not have permission to access this feature";

interface HistoryItem {
  id: string;
  qrData: string;
  name?: string;
  status: "success" | "already_present" | "error";
  time: Date;
  message?: string;
}

export default function ScannerClient() {
  const params = useParams();
  const router = useRouter();
  const eventId = String(params?.eventId || "");
  const { session, userData, isLoading: authLoading } = useAuth();
  
  // State
  const [isChecking, setIsChecking] = useState(true);
  const [event, setEvent] = useState<VolunteerEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [permission, setPermission] = useState<PermissionStatus>('prompt');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastScanResult, setLastScanResult] = useState<HistoryItem | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<IScanner | null>(null);
  const cooldownMapRef = useRef<Map<string, number>>(new Map());
  const attendeeCacheRef = useRef<Map<string, { name: string; status: string }>>(new Map());

  const isNative = useMemo(() => Capacitor.isNativePlatform(), []);

  const cachedEvent = useMemo(() => {
    return getActiveVolunteerEvents(userData?.volunteerEvents).find(
      (item) => item.event_id === eventId
    ) || null;
  }, [eventId, userData?.volunteerEvents]);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/auth");
    }
  }, [authLoading, router, session]);

  // Access Validation
  useEffect(() => {
    if (authLoading) return;
    if (!eventId || !session?.access_token) {
      setIsChecking(false);
      setError(DENIED_MESSAGE);
      return;
    }

    let cancelled = false;
    async function validateAccess() {
      setIsChecking(true);
      setError(null);
      setEvent(cachedEvent);
      try {
        const payload: any = await apiRequest(`/volunteer/events/${encodeURIComponent(eventId)}/access`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (payload.authorized === false) {
          setEvent(null);
          setError(payload.error || DENIED_MESSAGE);
          return;
        }
        setEvent(payload.event || cachedEvent);
      } catch (err: any) {
        if (!cancelled) {
          if (cachedEvent) setEvent(cachedEvent);
          else {
            setEvent(null);
            setError(err.message || "Unable to validate scanner access.");
          }
        }
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    }
    void validateAccess();
    return () => { cancelled = true; };
  }, [cachedEvent, eventId, authLoading, session]);

  // Scanner Lifecycle
  useEffect(() => {
    scannerRef.current = getScanner();
    void scannerRef.current.checkPermission().then(setPermission);
    return () => {
      void scannerRef.current?.stop();
    };
  }, []);

  const triggerFeedback = useCallback(async (type: "success" | "error" | "warning") => {
    if (isNative) {
      const hapticType = type === "success" ? NotificationType.Success : 
                         type === "warning" ? NotificationType.Warning : 
                         NotificationType.Error;
      await Haptics.notification({ type: hapticType });
    } else if ("vibrate" in navigator) {
      navigator.vibrate(type === "success" ? 200 : [100, 50, 100]);
    }

    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(type === "success" ? 880 : 220, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + (type === "success" ? 0.15 : 0.3));
    } catch (e) {}
  }, [isNative]);

  const processScan = async (scanResult: ScannerResult) => {
    if (!session?.access_token || !event) return;

    const qrCodeData = scanResult.data;
    const now = Date.now();
    const lastScanTime = cooldownMapRef.current.get(qrCodeData);

    // Cooldown check
    if (lastScanTime && now - lastScanTime < 3000) return; 
    cooldownMapRef.current.set(qrCodeData, now);

    let optimisticName = "Attendee";
    let isLocallyPresent = false;

    const cached = attendeeCacheRef.current.get(qrCodeData);
    if (cached) {
       optimisticName = cached.name || optimisticName;
       isLocallyPresent = cached.status === "already_present";
    } else {
       try {
         const parsed = JSON.parse(qrCodeData);
         if (parsed.name) optimisticName = parsed.name;
       } catch {}
    }

    if (isLocallyPresent) {
       void triggerFeedback("warning");
       const item: HistoryItem = { id: Math.random().toString(), qrData: qrCodeData, name: optimisticName, status: "already_present", time: new Date(), message: "Already scanned" };
       setLastScanResult(item);
       setTimeout(() => setLastScanResult(prev => prev?.id === item.id ? null : prev), 4000);
       return;
    }

    attendeeCacheRef.current.set(qrCodeData, { name: optimisticName, status: "already_present" });
    void triggerFeedback("success");

    const historyId = Math.random().toString(36).substr(2, 9);
    const newSuccessItem: HistoryItem = { id: historyId, qrData: qrCodeData, name: optimisticName, status: "success", time: new Date(), message: "Syncing..." };
    
    setHistory(prev => [newSuccessItem, ...prev].slice(0, 50)); 
    setLastScanResult(newSuccessItem);
    
    const requestBody = {
      qrCodeData,
      volunteerId: userData?.register_number,
      scannerInfo: { source: "sociomobilev2", platform: Capacitor.getPlatform(), format: scanResult.format, userAgent: navigator.userAgent, timestamp: new Date().toISOString() },
    };

    try {
      const payload: any = await apiRequest(`/events/${encodeURIComponent(event.event_id)}/scan-qr`, {
        method: "POST",
        body: JSON.stringify(requestBody),
        cache: "no-store",
      });

      const participant = payload.participant;
      const isAlreadyPresent = participant?.status === "already_present";
      const finalName = participant?.name || optimisticName;

      attendeeCacheRef.current.set(qrCodeData, { name: finalName, status: "already_present" });

      const updatedItem: HistoryItem = { ...newSuccessItem, name: finalName, status: isAlreadyPresent ? "already_present" : "success", message: isAlreadyPresent ? "Already marked present" : "Attendance marked" };
      
      setHistory(prev => prev.map(item => item.id === historyId ? updatedItem : item));
      setLastScanResult(prev => prev?.id === historyId ? updatedItem : prev);
      
      if (isAlreadyPresent) void triggerFeedback("warning");
      setTimeout(() => setLastScanResult(prev => prev?.id === historyId ? null : prev), 4000);
    } catch (err: any) {
      attendeeCacheRef.current.delete(qrCodeData);
      cooldownMapRef.current.set(qrCodeData, 0); 
      const errMsg = err.message || "Invalid QR or Network Error";
      void triggerFeedback("error");
      const errorItem: HistoryItem = { ...newSuccessItem, status: "error", message: errMsg };
      setHistory(prev => prev.map(item => item.id === historyId ? errorItem : item));
      setLastScanResult(prev => prev?.id === historyId ? errorItem : prev);
      setTimeout(() => setLastScanResult(prev => prev?.id === historyId ? null : prev), 5000);
    }
  };

  const startScanner = async () => {
    if (!videoRef.current || !scannerRef.current) return;
    try {
      setScannerError(null);
      let currentPermission = await scannerRef.current.checkPermission();
      if (currentPermission !== 'granted') {
        currentPermission = await scannerRef.current.requestPermission();
        setPermission(currentPermission);
        if (currentPermission !== 'granted') throw new Error("Camera permission is required");
      }
      await scannerRef.current.start(videoRef.current, (result) => void processScan(result));
      setIsScanning(true);
    } catch (err: any) {
      console.error("[Scanner] Start failed:", err);
      setIsScanning(false);
      setScannerError(err.message || "Camera access required");
    }
  };

  const stopScanner = async () => {
    await scannerRef.current?.stop();
    setIsScanning(false);
  };

  if (authLoading || (isChecking && !event)) return <LoadingScreen />;

  if (!event || error) {
    return (
      <div className="pwa-page px-4 pt-[calc(var(--nav-height)+var(--safe-top)+16px)]">
        <div className="mx-auto max-w-[420px] card p-8 text-center space-y-4">
          <AlertTriangleIcon size={48} className="mx-auto text-red-500" />
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{error || DENIED_MESSAGE}</p>
          <Button variant="primary" fullWidth onClick={() => router.replace("/volunteer")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`scanner-page-bg min-h-screen pb-24 pt-[calc(var(--nav-height)+var(--safe-top)+16px)] ${isScanning && isNative ? 'barcode-scanner-active' : ''}`}>
      <div className="mx-auto max-w-[420px] px-4 space-y-5">
        
        {/* Unified Header */}
        <div className="flex items-center justify-between">
          <Link href="/volunteer" className="back-btn"><ArrowLeftIcon size={18} /></Link>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700">
            <ShieldCheckIcon size={14} />
            <span className="text-[12px] font-bold">Authorized</span>
          </div>
        </div>

        {/* Event Banner */}
        <section className="card bg-[var(--color-primary-dark)] text-white p-5 border-none shadow-primary">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <QrCodeIcon size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black truncate">{event.title}</h1>
              <p className="text-xs text-blue-200">Scanner active • Keep steady</p>
            </div>
          </div>
        </section>

        {/* Scanner Viewport */}
        <div className="scanner-viewport-container">
          {/* On Web: Video element. On Native: Hidden (WebView made transparent) */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isNative ? 'opacity-0' : 'opacity-100'}`}
            muted
            playsInline
          />
          
          <AnimatePresence>
            {!isScanning && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/90 text-white px-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <CameraIcon size={32} className="text-white/70" />
                </div>
                <h3 className="font-bold">Scanner Ready</h3>
                <p className="text-xs text-white/60 mt-2 leading-relaxed">
                  Position the QR code within the frame to automatically check in the attendee.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Unified Overlay (Laser & Corners) */}
          {isScanning && (
            <div className="scanner-overlay-unified">
              <div className="scanner-corner-tl scanner-frame-corner" />
              <div className="scanner-corner-tr scanner-frame-corner" />
              <div className="scanner-corner-bl scanner-frame-corner" />
              <div className="scanner-corner-br scanner-frame-corner" />
              <div className="scanner-laser-line" />
            </div>
          )}
        </div>

        {/* Error Messages */}
        <AnimatePresence>
          {scannerError && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="card bg-red-50 border-red-100 p-4">
              <div className="flex gap-3 text-red-700 text-sm font-semibold">
                <AlertTriangleIcon size={18} className="shrink-0" />
                <p>{scannerError}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex gap-3">
          {!isScanning ? (
            <Button variant="primary" fullWidth size="lg" onClick={startScanner} leftIcon={<CameraIcon size={20} />}>
              Start Scanning
            </Button>
          ) : (
            <Button variant="danger" fullWidth size="lg" onClick={stopScanner} leftIcon={<XIcon size={20} />}>
              Stop Scanner
            </Button>
          )}
        </div>

        {/* Recent Scans List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold flex items-center gap-2">
              <CheckCircleIcon size={16} className="text-[var(--color-text-muted)]" />
              Recent Scans
            </h2>
            <span className="text-[11px] font-bold text-[var(--color-text-light)]">Last {history.length}</span>
          </div>

          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="card p-8 text-center border-dashed border-2 bg-transparent opacity-50">
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">No scans yet in this session</p>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="scanner-history-item bg-white p-3 rounded-2xl flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                    item.status === 'already_present' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {item.status === 'error' ? <XIcon size={18} /> : <CheckCircleIcon size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{item.name}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)] truncate">{item.message}</p>
                  </div>
                  <div className="text-[10px] font-bold text-[var(--color-text-light)]">
                    {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Unified Instant Feedback Toast */}
      <AnimatePresence>
        {lastScanResult && (
          <div className="scanner-toast">
            <motion.div 
              initial={{ y: -20, opacity: 0, scale: 0.9 }} 
              animate={{ y: 0, opacity: 1, scale: 1 }} 
              exit={{ y: -20, opacity: 0, scale: 0.9 }}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg border backdrop-blur-md ${
                lastScanResult.status === 'success' ? 'bg-emerald-500/95 border-emerald-400 text-white' :
                lastScanResult.status === 'already_present' ? 'bg-amber-500/95 border-amber-400 text-white' :
                'bg-red-500/95 border-red-400 text-white'
              }`}
            >
              <div className="bg-white/20 p-1.5 rounded-lg">
                {lastScanResult.status === 'error' ? <XIcon size={18} /> : <CheckCircleIcon size={18} />}
              </div>
              <div>
                <p className="text-[14px] font-black leading-none">{lastScanResult.name}</p>
                <p className="text-[11px] font-bold opacity-90 mt-0.5">{lastScanResult.message}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
