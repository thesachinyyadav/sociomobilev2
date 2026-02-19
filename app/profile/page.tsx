"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import EventCard from "@/components/EventCard";
import Skeleton from "@/components/Skeleton";
import LoadingScreen from "@/components/LoadingScreen";
import {
  LogOut,
  Mail,
  Hash,
  GraduationCap,
  Building,
  CalendarDays,
  ChevronRight,
  Bell,
  Ticket,
  MapPin,
  Settings,
} from "lucide-react";
import type { FetchedEvent } from "@/context/EventContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Registration {
  event_id: string;
  event?: FetchedEvent;
}

export default function ProfilePage() {
  const { userData, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regLoading, setRegLoading] = useState(true);

  useEffect(() => {
    if (!userData?.email) {
      setRegLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/registrations?email=${encodeURIComponent(userData.email)}`
        );
        if (res.ok) {
          const data = await res.json();
          setRegistrations(data.registrations ?? data ?? []);
        }
      } catch {}
      setRegLoading(false);
    })();
  }, [userData?.email]);

  // Deduplicate registrations by event_id
  const uniqueRegistrations = useMemo(() => {
    const seen = new Map<string, Registration>();
    for (const r of registrations) {
      if (!seen.has(r.event_id)) {
        seen.set(r.event_id, r);
      }
    }
    return Array.from(seen.values());
  }, [registrations]);

  useEffect(() => {
    if (!isLoading && !userData) router.replace("/auth");
  }, [isLoading, userData, router]);

  if (isLoading) return <LoadingScreen />;
  if (!userData) return <LoadingScreen />;

  const infoRows = [
    { icon: Mail, label: "Email", value: userData.email },
    userData.register_number && { icon: Hash, label: "Register No.", value: userData.register_number },
    userData.course && { icon: GraduationCap, label: "Course", value: userData.course },
    userData.department && { icon: Building, label: "Department", value: userData.department },
    userData.campus && { icon: MapPin, label: "Campus", value: userData.campus },
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top))]">
      {/* Profile header */}
      <div className="relative bg-gradient-to-br from-[var(--color-primary-dark)] via-[var(--color-primary)] to-[#1a6bdb] text-white px-5 pt-7 pb-10">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="flex items-center gap-4 relative z-10">
          {userData.avatar_url ? (
            <Image
              src={userData.avatar_url}
              alt={userData.name}
              width={60}
              height={60}
              className="rounded-full ring-3 ring-white/30"
            />
          ) : (
            <div className="w-[60px] h-[60px] rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
              {userData.name?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-extrabold truncate">{userData.name}</h1>
            <p className="text-[12px] opacity-75 mt-0.5">
              {userData.organization_type === "christ_member" ? "Christ University" : "External"}
            </p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="px-4 -mt-5 relative z-10 flex gap-3 mb-4">
        <button
          onClick={() => router.push("/notifications")}
          className="flex-1 card p-3 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
            <Bell size={17} className="text-[var(--color-primary)]" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-[13px] font-bold">Notifications</p>
          </div>
          <ChevronRight size={15} className="text-[var(--color-text-light)]" />
        </button>
      </div>

      {/* Info Card */}
      <div className="px-4 mb-4">
        <div className="card divide-y divide-[var(--color-border)]">
          {infoRows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-2.5">
              <Icon size={15} className="text-[var(--color-text-muted)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[var(--color-text-light)] uppercase tracking-wide">{label}</p>
                <p className="text-[13px] font-semibold truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Registered events — deduplicated + compact */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Ticket size={15} className="text-[var(--color-primary)]" />
          <h2 className="text-[15px] font-extrabold">My Registrations</h2>
          {uniqueRegistrations.length > 0 && (
            <span className="ml-auto text-[11px] font-bold text-[var(--color-text-muted)] bg-gray-100 px-2 py-0.5 rounded-full">
              {uniqueRegistrations.length}
            </span>
          )}
        </div>
        {regLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-[var(--radius)]" count={2} />
          </div>
        ) : uniqueRegistrations.length === 0 ? (
          <div className="card p-6 text-center">
            <CalendarDays size={28} className="mx-auto text-[var(--color-text-light)] mb-2" />
            <p className="text-[13px] font-semibold text-[var(--color-text-muted)]">
              No registrations yet
            </p>
            <p className="text-[12px] text-[var(--color-text-light)] mt-0.5">
              Browse events and register to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-2 stagger">
            {uniqueRegistrations.map((r) =>
              r.event ? (
                <EventCard key={r.event_id} event={r.event} compact />
              ) : (
                <div key={r.event_id} className="card p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-gray-100 flex items-center justify-center">
                    <CalendarDays size={16} className="text-[var(--color-text-muted)]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold">Event {r.event_id}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Registered</p>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Sign out */}
      <div className="px-4 mb-8">
        <button
          onClick={async () => {
            await signOut();
            router.replace("/auth");
          }}
          className="btn btn-danger w-full"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}
