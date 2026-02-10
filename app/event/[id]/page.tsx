"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEvents, type FetchedEvent } from "@/context/EventContext";
import { useAuth } from "@/context/AuthContext";
import {
  formatDateUTC,
  formatTime,
  getDaysUntil,
  formatDateRange,
} from "@/lib/dateUtils";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Tag,
  Ticket,
  Globe,
  FileText,
  Trophy,
  ListChecks,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Award,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ── helpers ── */
function parseJsonField<T>(raw: any): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    // [{value: "x"}] → ["x"]  or  ["x"] → ["x"]  or  [{time,activity}] → as-is
    return raw.map((item) =>
      typeof item === "object" && item !== null && "value" in item
        ? item.value
        : item
    ) as T[];
  }
  if (typeof raw === "string") {
    try {
      return parseJsonField(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id ? String(params.id) : null;
  const { allEvents, isLoading: ctxLoading } = useEvents();
  const { userData, isLoading: authLoading } = useAuth();

  const [event, setEvent] = useState<FetchedEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [registeredIds, setRegisteredIds] = useState<string[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (s: string) => setOpenSection(openSection === s ? null : s);

  /* ── Load event ── */
  useEffect(() => {
    if (!eventId) {
      setError("Invalid event ID");
      setLoading(false);
      return;
    }
    if (ctxLoading) return;

    const found = allEvents.find((e) => e.event_id === eventId);
    if (found) {
      setEvent(found);
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/events/${eventId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => setEvent(d.event ?? d))
      .catch(() => setError("Event not found"))
      .finally(() => setLoading(false));
  }, [eventId, allEvents, ctxLoading]);

  /* ── Load user registrations ── */
  useEffect(() => {
    if (!userData?.register_number || authLoading) return;
    fetch(`${API_URL}/api/registrations/user/${userData.register_number}/events`)
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d) =>
        setRegisteredIds(
          (d.events || []).map((e: any) => e.event_id || e.id).filter(Boolean)
        )
      )
      .catch(() => {});
  }, [userData, authLoading]);

  /* ── Register (inline for solo, no custom fields) ── */
  const handleRegister = async () => {
    if (!event || !userData) return;
    setRegError(null);

    // custom fields or team → redirect
    const customFields = parseJsonField(event.custom_fields);
    if (customFields.length > 0 || event.participants_per_team > 1) {
      router.push(`/event/${event.event_id}/register`);
      return;
    }

    // outsider check
    if (userData.organization_type === "outsider" && !event.allow_outsiders) {
      setRegError("This event is not open to external participants.");
      return;
    }

    const regNum =
      userData.organization_type === "outsider"
        ? userData.visitor_id || userData.register_number
        : userData.register_number;

    if (!regNum) {
      setRegError("Missing registration/visitor ID in your profile.");
      return;
    }

    setIsRegistering(true);
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.event_id,
          teamName: null,
          teammates: [
            {
              name: userData.name || "Unknown",
              registerNumber: String(regNum),
              email: userData.email || "",
            },
          ],
        }),
      });
      if (res.ok) {
        setShowSuccess(true);
        setRegisteredIds((p) => [...p, event.event_id]);
      } else {
        const d = await res.json();
        setRegError(d.error || d.message || "Registration failed.");
      }
    } catch {
      setRegError("Network error. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  /* ── Derived ── */
  const isRegistered = event ? registeredIds.includes(event.event_id) : false;
  const daysLeft = event ? getDaysUntil(event.registration_deadline) : null;
  const isClosed = daysLeft !== null && daysLeft < 0;
  const isFree = !event?.registration_fee || event.registration_fee <= 0;
  const rules = event ? parseJsonField<string>(event.rules) : [];
  const schedule = event
    ? parseJsonField<{ time: string; activity: string }>(event.schedule)
    : [];
  const prizes = event ? parseJsonField<string>(event.prizes) : [];

  /* ── Loading / Error ── */
  if (loading || ctxLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }
  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <AlertCircle size={40} className="text-red-400" />
        <p className="font-bold text-lg">{error || "Event not found"}</p>
        <Link href="/discover" className="btn btn-primary text-sm mt-2">
          Back to discover
        </Link>
      </div>
    );
  }

  /* ── Success Modal ── */
  if (showSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6">
        <div className="card p-6 text-center max-w-sm w-full animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-1">
            You&apos;re registered!
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            Successfully registered for {event.title}
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/discover" className="btn btn-primary text-sm w-full">
              Back to Discover
            </Link>
            {event.whatsapp_invite_link && (
              <a
                href={event.whatsapp_invite_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost text-sm w-full text-green-600 border-green-300"
              >
                <MessageCircle size={16} /> Join WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Accordion helper ── */
  const Section = ({
    id,
    icon,
    title,
    children,
  }: {
    id: string;
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
  }) => {
    const open = openSection === id;
    return (
      <div className="card mb-2 overflow-hidden">
        <button
          onClick={() => toggle(id)}
          className="flex items-center justify-between w-full p-3.5 text-left"
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            {icon}
            {title}
          </div>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {open && <div className="px-3.5 pb-3.5 pt-0 text-sm animate-fade-in">{children}</div>}
      </div>
    );
  };

  return (
    <div className="pb-28">
      {/* Back */}
      <div className="px-4 pt-3 pb-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Hero image */}
      <div className="relative aspect-[16/9] mx-4 rounded-2xl overflow-hidden bg-gray-100">
        <Image
          src={
            event.banner_url ||
            event.event_image_url ||
            "https://placehold.co/800x450/e2e8f0/94a3b8?text=Event"
          }
          alt={event.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Chips */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {isFree ? (
            <span className="chip bg-emerald-500 text-white">Free</span>
          ) : (
            <span className="chip bg-[var(--color-accent)] text-[var(--color-primary-dark)]">
              ₹{event.registration_fee}
            </span>
          )}
          {event.allow_outsiders && (
            <span className="chip bg-white/90 text-[var(--color-primary)]">
              <Globe size={10} /> Open
            </span>
          )}
          {event.claims_applicable && (
            <span className="chip bg-teal-500 text-white">Claims</span>
          )}
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h1 className="text-xl font-extrabold text-white leading-tight drop-shadow-lg">
            {event.title}
          </h1>
          {event.organizing_dept && (
            <span className="text-xs text-white/80">{event.organizing_dept}</span>
          )}
        </div>
      </div>

      {/* Quick info pills */}
      <div className="px-4 mt-3 flex flex-wrap gap-2">
        <div className="chip bg-blue-50 text-blue-700">
          <CalendarDays size={12} />
          {formatDateUTC(event.event_date)}
          {event.end_date && event.end_date !== event.event_date && (
            <> – {formatDateUTC(event.end_date)}</>
          )}
        </div>
        {event.event_time && (
          <div className="chip bg-purple-50 text-purple-700">
            <Clock size={12} /> {formatTime(event.event_time)}
          </div>
        )}
        <div className="chip bg-orange-50 text-orange-700">
          <MapPin size={12} /> {event.venue || "TBD"}
        </div>
        {event.participants_per_team > 1 && (
          <div className="chip bg-indigo-50 text-indigo-700">
            <Users size={12} /> Team of {event.participants_per_team}
          </div>
        )}
        {event.category && (
          <div className="chip bg-gray-100 text-gray-700">
            <Tag size={12} /> {event.category}
          </div>
        )}
        {daysLeft !== null && !isClosed && (
          <div
            className={`chip ${
              daysLeft <= 3 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
            }`}
          >
            <Ticket size={12} />
            {daysLeft === 0 ? "Last day!" : `${daysLeft} days left`}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="px-4 mt-4">
        <div className="card p-4">
          <h2 className="font-bold text-sm mb-2">About</h2>
          <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>
      </div>

      {/* Accordion sections */}
      <div className="px-4 mt-3">
        {rules.length > 0 && (
          <Section id="rules" icon={<ListChecks size={16} className="text-[var(--color-primary)]" />} title={`Rules (${rules.length})`}>
            <ul className="space-y-1.5">
              {rules.map((r, i) => (
                <li key={i} className="flex gap-2 text-[var(--color-text-muted)]">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  {String(r)}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {schedule.length > 0 && (
          <Section id="schedule" icon={<Clock size={16} className="text-purple-500" />} title="Schedule">
            <div className="space-y-2">
              {schedule.map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="shrink-0 w-14 text-xs font-mono font-semibold text-purple-600 pt-0.5">
                    {s.time || `#${i + 1}`}
                  </div>
                  <p className="text-[var(--color-text-muted)]">{s.activity}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {prizes.length > 0 && (
          <Section id="prizes" icon={<Trophy size={16} className="text-amber-500" />} title="Prizes">
            <ul className="space-y-1.5">
              {prizes.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <Award size={14} className={i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : "text-orange-400"} />
                  {String(p)}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {event.pdf_url && (
          <a
            href={event.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="card flex items-center gap-3 p-3.5 mb-2"
          >
            <FileText size={20} className="text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Event Document</p>
              <p className="text-xs text-[var(--color-text-muted)]">Tap to view PDF</p>
            </div>
          </a>
        )}

        {/* Contact */}
        {(event.organizer_email || event.organizer_phone) && (
          <div className="card p-4 mb-2">
            <h3 className="font-bold text-sm mb-2">Contact</h3>
            <div className="flex flex-col gap-1.5 text-sm text-[var(--color-text-muted)]">
              {event.organizer_email && (
                <a href={`mailto:${event.organizer_email}`} className="flex items-center gap-2">
                  <Mail size={14} /> {event.organizer_email}
                </a>
              )}
              {event.organizer_phone && (
                <a href={`tel:${event.organizer_phone}`} className="flex items-center gap-2">
                  <Phone size={14} /> {event.organizer_phone}
                </a>
              )}
              {event.whatsapp_invite_link && (
                <a href={event.whatsapp_invite_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600">
                  <MessageCircle size={14} /> WhatsApp Group
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {regError && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2 animate-fade-up">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{regError}</span>
        </div>
      )}

      {/* Sticky register bar */}
      <div className="fixed bottom-[var(--bottom-nav)] left-0 right-0 z-40 glass border-t border-white/30 p-3 px-4 animate-slide-up">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold text-[var(--color-text)]">
              {isFree ? "Free" : `₹${event.registration_fee}`}
            </p>
            {event.participants_per_team > 1 && (
              <p className="text-[10px] text-[var(--color-text-muted)]">per team</p>
            )}
          </div>
          <button
            onClick={handleRegister}
            disabled={isRegistered || isClosed || isRegistering || authLoading}
            className={`btn text-sm flex-1 max-w-[200px] ${
              isRegistered
                ? "bg-emerald-100 text-emerald-700 cursor-default"
                : isClosed
                ? "bg-gray-200 text-gray-500 cursor-default"
                : "btn-primary"
            }`}
          >
            {isRegistering ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isRegistered ? (
              <>
                <CheckCircle2 size={16} /> Registered
              </>
            ) : isClosed ? (
              "Closed"
            ) : event.participants_per_team > 1 ? (
              "Register team"
            ) : (
              "Register now"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
