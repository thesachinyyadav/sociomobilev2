"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Loader2, AlertTriangle, WifiOff, ShieldOff, LocateFixed, RefreshCw } from "lucide-react";

/* ── Christ University campus coordinates ── */
const CAMPUSES = [
  { name: "Central Campus",           lat: 12.9346, lng: 77.6068, radius: 1.5 },
  { name: "Bannerghatta Road Campus", lat: 12.8978, lng: 77.5968, radius: 1.5 },
  { name: "Yeshwanthpur Campus",      lat: 13.0206, lng: 77.5422, radius: 1.5 },
  { name: "Kengeri Campus",           lat: 12.9125, lng: 77.4834, radius: 1.5 },
] as const;

const MAX_CAMPUS_DISTANCE_KM = 2; // must be within 2 km

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ── Haversine distance (km) ── */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Status = "detecting" | "saving" | "success" | "error";
type ErrorKind = "denied" | "unavailable" | "timeout" | "not_near" | "api_fail";

interface CampusSelectorProps {
  email: string;
  onComplete: (campus: string) => void;
}

export default function CampusSelector({ email, onComplete }: CampusSelectorProps) {
  const [status, setStatus] = useState<Status>("detecting");
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [detectedCampus, setDetectedCampus] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const detect = useCallback(() => {
    setStatus("detecting");
    setErrorKind(null);

    if (!navigator.geolocation) {
      setStatus("error");
      setErrorKind("unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Find nearest campus
        let nearest = CAMPUSES[0] as (typeof CAMPUSES)[number];
        let minDist = Infinity;
        for (const c of CAMPUSES) {
          const d = haversine(latitude, longitude, c.lat, c.lng);
          if (d < minDist) {
            minDist = d;
            nearest = c;
          }
        }

        setDistance(Math.round(minDist * 100) / 100);

        if (minDist > MAX_CAMPUS_DISTANCE_KM) {
          setStatus("error");
          setErrorKind("not_near");
          return;
        }

        // Found a campus — save it
        setDetectedCampus(nearest.name);
        setStatus("saving");

        try {
          const res = await fetch(
            `${API_URL}/api/users/${encodeURIComponent(email)}/campus`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ campus: nearest.name }),
            }
          );
          if (res.ok) {
            setStatus("success");
            setTimeout(() => onComplete(nearest.name), 1200);
          } else {
            // API failed but still complete
            setStatus("success");
            setTimeout(() => onComplete(nearest.name), 1200);
          }
        } catch {
          setStatus("success");
          setTimeout(() => onComplete(nearest.name), 1200);
        }
      },
      (err) => {
        setStatus("error");
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setErrorKind("denied");
            break;
          case err.POSITION_UNAVAILABLE:
            setErrorKind("unavailable");
            break;
          case err.TIMEOUT:
            setErrorKind("timeout");
            break;
          default:
            setErrorKind("unavailable");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [email, onComplete]);

  useEffect(() => {
    detect();
  }, [detect]);

  const errorMessages: Record<ErrorKind, { icon: React.ReactNode; title: string; message: string }> = {
    denied: {
      icon: <ShieldOff size={28} className="text-red-500" />,
      title: "Location Access Denied",
      message:
        "SOCIO needs your location to detect your Christ University campus. Please enable location permissions in your browser settings and try again.",
    },
    unavailable: {
      icon: <WifiOff size={28} className="text-orange-500" />,
      title: "Location Unavailable",
      message:
        "We couldn't determine your location. Make sure your device's location services (GPS) are turned on and you have a stable internet connection.",
    },
    timeout: {
      icon: <AlertTriangle size={28} className="text-amber-500" />,
      title: "Location Request Timed Out",
      message:
        "It took too long to get your location. Please make sure you're in an area with good GPS signal and try again.",
    },
    not_near: {
      icon: <MapPin size={28} className="text-red-500" />,
      title: "Not Near Any Campus",
      message: `You don't appear to be near any Christ University campus (nearest is ${distance ?? "?"} km away). Campus detection only works when you're physically on or near a campus.`,
    },
    api_fail: {
      icon: <AlertTriangle size={28} className="text-red-500" />,
      title: "Server Error",
      message: "Failed to save your campus. Please check your connection and try again.",
    },
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        {/* Header */}
        <div className="px-5 pt-5 pb-2 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center">
            {status === "detecting" || status === "saving" ? (
              <LocateFixed size={24} className="text-[var(--color-primary)] animate-pulse" />
            ) : status === "success" ? (
              <MapPin size={24} className="text-emerald-600" />
            ) : (
              <MapPin size={24} className="text-red-500" />
            )}
          </div>
          <h2 className="text-lg font-extrabold">
            {status === "detecting"
              ? "Detecting Campus..."
              : status === "saving"
              ? "Saving..."
              : status === "success"
              ? "Campus Detected!"
              : "Detection Failed"}
          </h2>
        </div>

        <div className="px-5 pb-5">
          {/* Detecting */}
          {status === "detecting" && (
            <div className="flex flex-col items-center py-6">
              <Loader2 size={36} className="animate-spin text-[var(--color-primary)] mb-3" />
              <p className="text-[13px] text-[var(--color-text-muted)] text-center">
                Getting your location to find your Christ University campus...
              </p>
              <p className="text-[11px] text-[var(--color-text-light)] mt-1 text-center">
                Please allow location access if prompted
              </p>
            </div>
          )}

          {/* Saving */}
          {status === "saving" && detectedCampus && (
            <div className="flex flex-col items-center py-6">
              <Loader2 size={36} className="animate-spin text-[var(--color-primary)] mb-3" />
              <p className="text-[14px] font-semibold text-center">{detectedCampus}</p>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-1">Saving your campus...</p>
            </div>
          )}

          {/* Success */}
          {status === "success" && detectedCampus && (
            <div className="flex flex-col items-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-[15px] font-bold text-center">{detectedCampus}</p>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
                {distance != null && `${distance} km away`}
              </p>
            </div>
          )}

          {/* Error */}
          {status === "error" && errorKind && (
            <div className="py-4">
              <div className="flex flex-col items-center text-center mb-4">
                {errorMessages[errorKind].icon}
                <h3 className="text-[14px] font-bold mt-2">{errorMessages[errorKind].title}</h3>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                  {errorMessages[errorKind].message}
                </p>
              </div>
              <button onClick={detect} className="btn btn-primary w-full">
                <RefreshCw size={16} /> Try Again
              </button>
              <button
                onClick={() => onComplete("")}
                className="btn btn-ghost w-full mt-2 text-[12px]"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
