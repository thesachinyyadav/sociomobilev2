"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { formatDateUTC } from "@/lib/dateUtils";
import {
  User,
  Mail,
  Hash,
  LogOut,
  CalendarDays,
  MapPin,
  ChevronRight,
  Loader2,
  AlertCircle,
  BadgeCheck,
  Globe,
  IdCard,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RegisteredEvent {
  event_id: string;
  title: string;
  event_date: string;
  venue?: string;
  team_name?: string;
  registration_date?: string;
}

export default function ProfilePage() {
  const { user, userData, signOut, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<RegisteredEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (authLoading || !userData?.register_number) return;
    setLoadingEvents(true);
    fetch(`${API_URL}/api/registrations/user/${userData.register_number}/events`)
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d) => setEvents(d.events || []))
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  }, [userData, authLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <User size={48} className="text-gray-300" />
        <p className="font-bold text-lg">Sign in to view your profile</p>
        <Link href="/auth" className="btn btn-primary text-sm mt-2">
          Sign in with Google
        </Link>
      </div>
    );
  }

  const isOutsider = userData.organization_type === "outsider";

  return (
    <div className="pb-28 animate-fade-up">
      {/* Profile header */}
      <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white p-6 pt-4 rounded-b-3xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30 bg-white/20 flex items-center justify-center shrink-0">
            {user.user_metadata?.avatar_url ? (
              <Image
                src={user.user_metadata.avatar_url}
                alt="avatar"
                width={64}
                height={64}
                className="object-cover"
              />
            ) : (
              <User size={28} className="text-white/70" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{userData.name}</h1>
            <p className="text-xs opacity-75 truncate">{userData.email}</p>
            <div className="flex items-center gap-2 mt-1">
              {isOutsider ? (
                <span className="chip bg-white/20 text-white text-[10px]">
                  <Globe size={10} /> External
                </span>
              ) : (
                <span className="chip bg-white/20 text-white text-[10px]">
                  <BadgeCheck size={10} /> Christ
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="px-4 mt-4 space-y-2">
        <div className="card p-4">
          <h2 className="text-sm font-bold mb-3">Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
              <Hash size={16} className="text-[var(--color-primary)]" />
              <div>
                <p className="text-[10px] opacity-60">Register Number</p>
                <p className="font-medium text-[var(--color-text)]">
                  {userData.register_number || "—"}
                </p>
              </div>
            </div>
            {isOutsider && userData.visitor_id && (
              <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
                <IdCard size={16} className="text-[var(--color-accent)]" />
                <div>
                  <p className="text-[10px] opacity-60">Visitor ID</p>
                  <p className="font-medium text-[var(--color-text)]">
                    {userData.visitor_id}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
              <Mail size={16} className="text-indigo-500" />
              <div>
                <p className="text-[10px] opacity-60">Email</p>
                <p className="font-medium text-[var(--color-text)] truncate max-w-[230px]">
                  {userData.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Registered events */}
        <div className="card p-4">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <CalendarDays size={16} className="text-[var(--color-primary)]" />
            My Events
            {events.length > 0 && (
              <span className="chip bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px]">
                {events.length}
              </span>
            )}
          </h2>

          {loadingEvents ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-6 text-sm text-[var(--color-text-muted)]">
              <CalendarDays size={24} className="mx-auto mb-2 opacity-30" />
              <p>No events yet</p>
              <Link href="/discover" className="text-[var(--color-primary)] text-xs underline mt-1 inline-block">
                Explore events →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <Link
                  key={ev.event_id}
                  href={`/event/${ev.event_id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                    <CalendarDays size={14} className="text-[var(--color-primary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{ev.title}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {ev.venue && `${ev.venue} · `}
                      {formatDateUTC(ev.event_date)}
                    </p>
                    {ev.team_name && (
                      <p className="text-[10px] text-[var(--color-primary)]">
                        Team: {ev.team_name}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={async () => {
            await signOut();
            router.push("/");
          }}
          className="btn btn-ghost w-full text-sm text-red-500 border-red-200 mt-4"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}
