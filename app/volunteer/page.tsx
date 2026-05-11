"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type VolunteerEvent } from "@/context/AuthContext";
import { useShakeToScan } from "@/context/ShakeToScanContext";
import LoadingScreen from "@/components/LoadingScreen";
import { Button } from "@/components/Button";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  MapPinIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  UsersIcon,
  ZapIcon,
  BellIcon,
} from "@/components/icons";
import { formatDateShort } from "@/lib/dateUtils";
import { getActiveVolunteerEvents } from "@/lib/volunteerAccess";
import { apiRequest } from "@/lib/apiClient";

const DENIED_MESSAGE = "You do not have permission to access this feature";

/** Returns true when the volunteer assignment expires within 24 hours */
function isExpiringSoon(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() - Date.now() < 24 * 60 * 60 * 1000;
}

export default function VolunteerDashboardPage() {
  const router = useRouter();
  const { session, userData, isLoading } = useAuth();
  const {
    activeScanEvent,
    shakeEnabled,
    enableForEvent,
    disableShake,
    requestMotionPermission,
    motionSupported,
    motionPermission,
  } = useShakeToScan();
  const [events, setEvents] = useState<VolunteerEvent[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState<string | null>(null);

  const cachedActiveEvents = useMemo(
    () => getActiveVolunteerEvents(userData?.volunteerEvents),
    [userData?.volunteerEvents]
  );

  const activeShakeEvent = useMemo(() => {
    const source = events.length > 0 ? events : cachedActiveEvents;
    return source.find((item) => item.event_id === activeScanEvent) || null;
  }, [activeScanEvent, cachedActiveEvents, events]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/auth");
    }
  }, [isLoading, router, session]);

  const handleToggleShake = async (eventId: string) => {
    setShakeError(null);

    if (shakeEnabled && activeScanEvent === eventId) {
      disableShake();
      return;
    }

    if (!motionSupported) {
      setShakeError("Motion sensors are not available on this device.");
      return;
    }

    const granted = await requestMotionPermission();
    if (!granted) {
      setShakeError("Motion permission is required to enable shake to scan.");
      return;
    }

    enableForEvent(eventId);
  };

  const fetchVolunteerEvents = useCallback(async () => {
    if (isLoading || !session?.access_token) return;

    setIsFetching(true);
    setError(null);
    setEvents(cachedActiveEvents);

    try {
      const payload: any = await apiRequest(`/volunteer/events`, {
        cache: "no-store",
      });

      const nextEvents = getActiveVolunteerEvents(payload.events || []);
      setEvents(nextEvents);
    } catch (err: any) {
      setEvents([]);
      setError(err.message || "Unable to load volunteer assignments.");
    } finally {
      setIsFetching(false);
    }
  }, [cachedActiveEvents, isLoading, session]);

  useEffect(() => {
    fetchVolunteerEvents();
  }, [fetchVolunteerEvents]);

  if (isLoading || (isFetching && events.length === 0 && !error)) {
    return <LoadingScreen />;
  }

  // Guard: volunteers must have a register number (Christ University members only)
  if (!isLoading && userData && !userData.register_number) {
    return (
      <div className="pwa-page min-h-screen px-4 pb-[calc(var(--bottom-nav)+var(--safe-bottom)+96px)] pt-[calc(var(--nav-height)+var(--safe-top)+16px)] bg-slate-50">
        <div className="mx-auto max-w-[420px]">
          <section className="card-op text-center py-10 shadow-xl border-none">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm">
              <ShieldCheckIcon size={32} />
            </div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              Institutional Access Only
            </h1>
            <p className="mx-auto mt-3 max-w-[300px] text-sm leading-6 text-slate-500 font-medium">
              Only verified university members with a valid registration ID can access the volunteer dashboard.
            </p>
            <div className="mt-8 px-6">
               <Button variant="primary" fullWidth onClick={() => router.replace("/")}>
                 Back to Marketplace
               </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const isVolunteer = (userData?.volunteerEvents && userData.volunteerEvents.length > 0) || events.length > 0;
  const hasActiveEvents = events.length > 0;
  const showDenied = error || (!isVolunteer && !isFetching);
  const showNoActive = isVolunteer && !hasActiveEvents && !isFetching && !error;

  return (
    <div className="pwa-page min-h-screen bg-slate-50 pb-[calc(var(--bottom-nav)+var(--safe-bottom)+40px)]">
      
      {/* Premium Operational Header */}
      <header className="header-op">
        <div className="h-10 w-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-200 shrink-0">
          {userData?.avatar_url ? (
            <img src={userData.avatar_url} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-400">
               <UsersIcon size={20} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Volunteer</p>
          <h1 className="text-sm font-black text-slate-900 truncate mt-1">
             {userData?.name || "Operations Lead"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
           <button className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-transform">
              <BellIcon size={18} />
           </button>
           <div className="badge-op badge-op-success">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
           </div>
        </div>
      </header>

      <div className="mx-auto max-w-[440px] px-4 pt-6 space-y-6">
        
        {/* Ops Stats Grid */}
        <section className="grid grid-cols-2 gap-3">
           <div className="card-op border-none shadow-sm bg-white p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Ops</p>
              <div className="flex items-end justify-between mt-2">
                 <span className="text-2xl font-black text-slate-900 leading-none">{events.length}</span>
                 <ZapIcon size={18} className="text-blue-500 mb-0.5" />
              </div>
           </div>
           <div className="card-op border-none shadow-sm bg-white p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Status</p>
              <div className="flex items-end justify-between mt-2">
                 <span className="text-sm font-black text-emerald-600 uppercase leading-none">Operational</span>
                 <ShieldCheckIcon size={18} className="text-emerald-500 mb-0.5" />
              </div>
           </div>
        </section>

        {showDenied ? (
          <section className="card-op p-8 text-center bg-white border-none shadow-sm">
            <AlertTriangleIcon size={40} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-lg font-black text-slate-900">Access Restricted</h2>
            <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">
              {error || "Your account does not have active volunteer privileges."}
            </p>
            <Button variant="primary" className="mt-6" fullWidth onClick={() => router.replace("/")}>
              Exit Operations
            </Button>
          </section>
        ) : showNoActive ? (
          <section className="card-op p-8 text-center bg-white border-none shadow-sm">
            <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-500">
               <CalendarDaysIcon size={32} />
            </div>
            <h2 className="text-lg font-black text-slate-900">Standby Mode</h2>
            <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">
              No active event assignments detected for the current session.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button variant="primary" fullWidth onClick={() => fetchVolunteerEvents()}>
                Synchronize Ops
              </Button>
              <Button variant="ghost" fullWidth onClick={() => router.replace("/")}>
                Return to Dashboard
              </Button>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 Assigned Scanners
              </h2>
              <span className="h-1 w-1 rounded-full bg-slate-300 flex-1 mx-4" />
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                LIVE OPS
              </span>
            </div>

            {/* Event cards */}
            <div className="space-y-3">
              {events.map((event) => {
                const expiringSoon = isExpiringSoon(event.volunteer_assignment?.expires_at);
                
                return (
                  <div key={event.event_id} className="card-op border-none shadow-sm bg-white overflow-hidden p-0 active:scale-95 transition-all">
                    <Link
                      href={`/volunteer/scanner/${encodeURIComponent(event.event_id)}`}
                      className="block p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 shadow-lg shadow-slate-200">
                           <QrCodeIcon size={24} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between gap-2">
                              <h3 className="text-[15px] font-black text-slate-900 truncate tracking-tight">
                                {event.title}
                              </h3>
                              {expiringSoon && (
                                <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" title="Expiring soon" />
                              )}
                           </div>
                           
                           <div className="mt-1 flex items-center gap-3 text-[11px] font-bold text-slate-400">
                              <span className="flex items-center gap-1">
                                 <CalendarDaysIcon size={12} className="text-blue-500" />
                                 {formatDateShort(event.event_date)}
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                 <MapPinIcon size={12} className="text-blue-500" />
                                 {event.venue || "Campus Venue"}
                              </span>
                           </div>

                           <div className="mt-3 flex items-center gap-2">
                              <div className="badge-op badge-op-info lowercase">
                                 Check-in active
                              </div>
                              <div className="flex-1 h-px bg-slate-50" />
                              <ChevronRightIcon size={16} className="text-slate-300" />
                           </div>
                        </div>
                      </div>
                    </Link>

                    {/* Shake-to-scan toggle row */}
                    <div className="bg-slate-50/50 px-4 py-3 flex items-center justify-between border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <ZapIcon size={14} className={shakeEnabled && activeScanEvent === event.event_id ? "text-emerald-500" : "text-slate-300"} />
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                           Shake to Start
                        </span>
                      </div>
                      
                      <div 
                        onClick={(e) => {
                          e.preventDefault();
                          void handleToggleShake(event.event_id);
                        }}
                        className={`toggle-op ${shakeEnabled && activeScanEvent === event.event_id ? 'toggle-op-active' : ''}`}
                      >
                         <div className="toggle-op-thumb" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {shakeError && (
              <div className="card-op bg-red-50 border-red-100 p-3 flex gap-3 text-red-700 text-[11px] font-bold">
                 <AlertTriangleIcon size={16} className="shrink-0" />
                 <p>{shakeError}</p>
              </div>
            )}
          </section>
        )}

        {/* Global Operational Footer */}
        <footer className="text-center py-4">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              SOCIO Operations • Production v2.0
           </p>
        </footer>
      </div>
    </div>
  );
}
