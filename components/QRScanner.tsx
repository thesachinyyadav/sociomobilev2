"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangleIcon, CameraIcon, CheckCircleIcon, QrCodeIcon, XIcon, UserIcon } from "@/components/icons";
import { Button } from "@/components/Button";
import { apiRequest } from "@/lib/apiClient";
import { getScanner, IScanner, ScannerResult } from "@/lib/ScannerService";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";

interface QRScannerProps {
  eventId: string;
  onScanSuccess?: (result: ScanPayload) => void;
}

interface ScanResult {
  name?: string;
  email?: string;
  registrationId?: string;
  status?: "marked_present" | "already_present";
  markedAt?: string;
}

interface ScanPayload {
  participant?: ScanResult;
  error?: string;
  message?: string;
}

interface HistoryItem {
  id: string;
  qrData: string;
  name?: string;
  status: "success" | "already_present" | "error";
  time: Date;
  message?: string;
}

export default function QRScanner({ eventId, onScanSuccess }: QRScannerProps) {
  const { session, userData } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<IScanner | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const cooldownMapRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    scannerRef.current = getScanner();
    return () => {
      void scannerRef.current?.stop();
    };
  }, []);

  const triggerHaptic = async (type: "success" | "error" | "warning") => {
    if (Capacitor.isNativePlatform()) {
      if (type === "success") {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (type === "warning") {
        await Haptics.notification({ type: NotificationType.Warning });
      } else {
        await Haptics.notification({ type: NotificationType.Error });
      }
    } else if ("vibrate" in navigator) {
      if (type === "success") {
        navigator.vibrate(200);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  const playSound = (type: "success" | "error") => {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      if (type === "success") {
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } else {
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3 note
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Sound feedback failed:", e);
    }
  };

  const stopScanner = async () => {
    await scannerRef.current?.stop();
    setIsScanning(false);
  };

  const processScan = async (scanResult: ScannerResult) => {
    if (!session?.access_token) return;

    const qrCodeData = scanResult.data;
    const now = Date.now();
    const lastScanTime = cooldownMapRef.current.get(qrCodeData);

    // 4 second cooldown for the EXACT same QR code to prevent accidental rapid double-scans
    if (lastScanTime && now - lastScanTime < 4000) {
      return; 
    }
    
    // Set immediate cooldown to block concurrent requests
    cooldownMapRef.current.set(qrCodeData, now);

    // Optimistic toast while fetching
    const loadingToastId = toast.loading("Verifying...", {
      style: { borderRadius: "var(--radius)", fontSize: "13px", fontWeight: 600 }
    });

    console.log(`🔍 [AttendanceSyncDebug] Scanned QR Payload: ${qrCodeData}`);
    
    const requestBody = {
      qrCodeData,
      volunteerId: userData?.register_number,
      scannerInfo: {
        source: "sociomobilev2",
        platform: Capacitor.getPlatform(),
        format: scanResult.format,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    };
    console.log(`🔍 [AttendanceSyncDebug] API Request to /events/${eventId}/scan-qr:`, requestBody);

    try {
      const payload: any = await apiRequest(`/events/${encodeURIComponent(eventId)}/scan-qr`, {
        method: "POST",
        body: JSON.stringify(requestBody),
        cache: "no-store",
      });
      
      console.log(`🔍 [AttendanceSyncDebug] Backend Response SUCCESS:`, payload);

      const participant = payload.participant;
      const isAlreadyPresent = participant?.status === "already_present";

      if (isAlreadyPresent) {
         void triggerHaptic("warning");
         toast.success(`Already scanned: ${participant.name}`, { id: loadingToastId, icon: "⚠️" });
      } else {
         void triggerHaptic("success");
         playSound("success");
         toast.success(`Checked in: ${participant.name}`, { id: loadingToastId });
      }

      const newSuccessItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        qrData: qrCodeData,
        name: participant?.name || "Unknown Participant",
        status: isAlreadyPresent ? "already_present" : "success",
        time: new Date(),
        message: isAlreadyPresent ? "Already marked present" : "Attendance marked"
      };

      setHistory(prev => [newSuccessItem, ...prev].slice(0, 10)); // Keep last 10 scans

      onScanSuccess?.(payload);

    } catch (err: any) {
      void triggerHaptic("error");
      playSound("error");
      
      const errMsg = err.message || "Invalid QR or Network Error";
      toast.error(errMsg, { id: loadingToastId });
      
      const newErrorItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        qrData: qrCodeData,
        status: "error",
        time: new Date(),
        message: errMsg
      };

      setHistory(prev => [newErrorItem, ...prev].slice(0, 10));

      // Reset cooldown for error so they can try again quickly
      cooldownMapRef.current.set(qrCodeData, 0); 
    }
  };

  const startScanner = async () => {
    if (!videoRef.current) return;
    if (!session?.access_token) {
      setError("Please sign in again to use the scanner.");
      return;
    }

    try {
      console.log('[QRScanner] Starting scanner. Platform Native:', Capacitor.isNativePlatform());
      setError(null);
      
      // Request permissions (handled by the service for native)
      if (!Capacitor.isNativePlatform()) {
        console.log('[QRScanner] Requesting web camera permissions...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
      }
      setHasPermission(true);

      console.log('[QRScanner] Calling scannerRef.current?.start()...');
      await scannerRef.current?.start(videoRef.current, (result) => {
        void processScan(result);
      });
      
      console.log('[QRScanner] Scanner started successfully.');
      setIsScanning(true);
    } catch (err: any) {
      console.error("[QRScanner] Scanner failed to start:", err);
      setHasPermission(false);
      setIsScanning(false);
      setError(err.message || "Camera access is required to scan QR codes.");
    }
  };

  return (
    <div className="space-y-4">
      <div className={`card overflow-hidden ${isScanning && Capacitor.isNativePlatform() ? 'native-scanning' : ''}`}>
        <div className="p-4">
          <div className={`relative overflow-hidden rounded-[22px] bg-black ${isScanning && Capacitor.isNativePlatform() ? 'transparent-for-native shadow-none' : ''}`}>
            <video
              ref={videoRef}
              className={`aspect-[4/3] w-full object-cover ${Capacitor.isNativePlatform() ? 'hidden' : ''}`}
              muted
              playsInline
            />

            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 px-6 text-center text-white">
                <QrCodeIcon size={42} className="mb-3 text-white/70" />
                <p className="text-[14px] font-bold">Scanner locked to this event</p>
                <p className="mt-1 text-[12px] leading-5 text-white/65">
                  Start the camera only when you are ready to scan attendee tickets.
                </p>
              </div>
            )}
            
            {isScanning && (
              <>
                <div className="pointer-events-none absolute inset-6 z-10">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-[16px]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-[16px]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-[16px]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-[16px]" />
                </div>
                <div className="pointer-events-none absolute left-6 right-6 h-[1px] bg-emerald-400 shadow-[0_0_8px_4px_rgba(52,211,153,0.4)] animate-scanner-laser z-10" />
              </>
            )}
          </div>

          {hasPermission === false && (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-[12px] font-semibold text-red-700">
              Camera permission is required to scan QR codes.
            </div>
          )}

          {error && !isScanning && (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3">
              <div className="flex items-start gap-2 text-[12px] font-semibold text-red-700">
                <AlertTriangleIcon size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {!isScanning ? (
              <Button
                variant="primary"
                fullWidth
                onClick={startScanner}
                leftIcon={<CameraIcon size={16} />}
              >
                Start Scanner
              </Button>
            ) : (
              <Button
                variant="danger"
                fullWidth
                onClick={stopScanner}
                leftIcon={<XIcon size={16} />}
              >
                Stop Scanner
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* History Panel */}
      {history.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-1.5 text-[var(--color-text)]">
              <CheckCircleIcon size={14} className="text-[var(--color-text-muted)]" />
              Recent Scans
            </h3>
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
              Last {history.length}
            </span>
          </div>
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100 animate-fade-in">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  item.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                  item.status === 'already_present' ? 'bg-amber-100 text-amber-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {item.status === 'success' ? <CheckCircleIcon size={14} /> :
                   item.status === 'already_present' ? <CheckCircleIcon size={14} /> :
                   <XIcon size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[var(--color-text)] truncate">
                    {item.name || "Invalid QR"}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                    {item.message}
                  </p>
                </div>
                <div className="text-[10px] font-semibold text-[var(--color-text-light)] whitespace-nowrap">
                  {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
