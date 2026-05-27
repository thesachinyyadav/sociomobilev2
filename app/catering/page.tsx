"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import { Button } from "@/components/Button";
import {
  ChefHatIcon as ChefHat,
  CalendarIcon as CalendarDays,
  AlertTriangleIcon,
  CheckCircleIcon as CheckCircle,
  XCircleIcon as XCircle,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon as ChevronRight,
  ClockIcon as Clock3,
} from "@/components/icons";
import { formatDateShort } from "@/lib/dateUtils";
import { apiRequest } from "@/lib/apiClient";

interface CateringBooking {
  booking_id: string;
  booked_by: string;
  description: string | null;
  status: "pending" | "accepted" | "declined";
  event_fest_id: string | null;
  event_fest_type: "event" | "fest" | null;
  catering_id: string;
  contact_details: any;
  created_at: string;
  event_title: string | null;
  event_date: string | null;
  fest_title: string | null;
  fest_opening_date: string | null;
  catering_name: string | null;
}

interface Vendor {
  catering_id: string;
  catering_name: string;
}

type StatusFilter = "all" | "pending" | "accepted" | "declined";

const DENIED_MESSAGE = "You do not have permission to access catering services";
const PAGE_SIZE = 8;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all",      label: "All"      },
  { key: "pending",  label: "Pending"  },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
];

export default function CateringDashboardPage() {
  const router = useRouter();
  const { session, userData, isLoading } = useAuth();

  const [bookings,        setBookings]        = useState<CateringBooking[]>([]);
  const [vendors,         setVendors]         = useState<Vendor[]>([]);
  const [isFetching,      setIsFetching]      = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [statusFilter,    setStatusFilter]    = useState<StatusFilter>("all");
  const [selectedVendorId,setSelectedVendorId]= useState<string>("");
  const [page,            setPage]            = useState(1);

  useEffect(() => {
    if (!isLoading && !session) router.replace("/auth");
  }, [isLoading, router, session]);

  const fetchBookings = useCallback(async () => {
    if (isLoading || !session?.access_token) return;
    setIsFetching(true);
    setError(null);
    try {
      // Pull up to 1 000 rows; all filtering/paging is client-side.
      const payload: any = await apiRequest(
        `/catering/bookings?page=1&pageSize=1000`,
        { cache: "no-store" }
      );
      setBookings(payload.bookings || []);
      if (payload.vendors) setVendors(payload.vendors);
    } catch (err: any) {
      setError(err.message || "Failed to load catering orders.");
    } finally {
      setIsFetching(false);
    }
  }, [isLoading, session?.access_token]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Reset page whenever filters change
  useEffect(() => { setPage(1); }, [statusFilter, selectedVendorId]);

  const handleAction = async (bookingId: string, action: "accept" | "decline") => {
    if (!session?.access_token) return;
    try {
      await apiRequest(`/catering/bookings/${bookingId}/action`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId
            ? { ...b, status: action === "accept" ? "accepted" : "declined" }
            : b
        )
      );
    } catch (err: any) {
      alert(err.message || "Network error. Please try again.");
    }
  };

  // ── Derived lists ──────────────────────────────────────────────────────────

  const sortedBookings = useMemo(() =>
    [...bookings].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  [bookings]);

  const filteredBookings = useMemo(() => {
    let list = sortedBookings;
    if (selectedVendorId) list = list.filter((b) => b.catering_id === selectedVendorId);
    if (statusFilter !== "all") list = list.filter((b) => b.status === statusFilter);
    return list;
  }, [sortedBookings, selectedVendorId, statusFilter]);

  const totalPages  = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const pagedBookings = filteredBookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => ({
    all:      sortedBookings.filter((b) => !selectedVendorId || b.catering_id === selectedVendorId).length,
    pending:  sortedBookings.filter((b) => b.status === "pending"  && (!selectedVendorId || b.catering_id === selectedVendorId)).length,
    accepted: sortedBookings.filter((b) => b.status === "accepted" && (!selectedVendorId || b.catering_id === selectedVendorId)).length,
    declined: sortedBookings.filter((b) => b.status === "declined" && (!selectedVendorId || b.catering_id === selectedVendorId)).length,
  }), [sortedBookings, selectedVendorId]);

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (isLoading || (isFetching && bookings.length === 0)) return <LoadingScreen />;

  if (!userData?.is_masteradmin && !userData?.roles?.catering) {
    return (
      <div className="pwa-page-center bg-[var(--color-bg)] px-4">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-3">
          <AlertTriangleIcon className="text-red-500" size={28} />
        </div>
        <h1 className="text-[16px] font-bold mb-1.5">Access Denied</h1>
        <p className="text-[12px] text-[var(--color-text-muted)] mb-4">{DENIED_MESSAGE}</p>
        <Button onClick={() => router.push("/profile")}>Back to Profile</Button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="pwa-page bg-[#F8FAFC]">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 pt-2 px-4 pb-0">

        {/* Back + Title row */}
        <div className="flex items-center gap-2.5 mb-3">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            title="Go back"
            className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-[var(--color-text)] active:scale-90 transition-transform"
          >
            <ArrowLeftIcon size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-black tracking-tight text-slate-900 leading-tight">
              Catering Orders
            </h1>
            {vendors.length > 1 ? (
              <div className="relative mt-0.5 inline-block">
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  aria-label="Select catering shop"
                  title="Select catering shop"
                  className="appearance-none bg-blue-50 border-none text-[10px] font-bold text-blue-700 py-1 pl-2 pr-6 rounded-lg focus:ring-1 focus:ring-blue-200 outline-none cursor-pointer uppercase tracking-wider"
                >
                  <option value="">All Shops</option>
                  {vendors.map((v) => (
                    <option key={v.catering_id} value={v.catering_id}>
                      {v.catering_name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-blue-600">
                  <ChevronRight size={12} className="rotate-90" />
                </div>
              </div>
            ) : (
              !error && (
                <p className="text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-wider">
                  {vendors[0]?.catering_name || "Vendor Dashboard"}
                </p>
              )
            )}
          </div>
        </div>

        {/* ── Status filter chips ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-none">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 ${
                statusFilter === key
                  ? key === "pending"  ? "bg-blue-600 text-white shadow-sm"
                  : key === "accepted" ? "bg-emerald-600 text-white shadow-sm"
                  : key === "declined" ? "bg-rose-600 text-white shadow-sm"
                  :                       "bg-slate-800 text-white shadow-sm"
                  : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                statusFilter === key
                  ? "bg-white/25 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 pb-4 pt-4 max-w-2xl mx-auto">

        {error ? (
          <div className="bg-white rounded-xl p-5 text-center flex flex-col items-center mt-6 shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
              <AlertTriangleIcon className="text-red-500" size={24} />
            </div>
            <p className="text-[13px] font-bold text-red-600 mb-1">Failed to Load Orders</p>
            <p className="text-[11px] text-[var(--color-text-muted)] mb-4">{error}</p>
            <Button size="md" variant="primary" onClick={fetchBookings}>Retry</Button>
          </div>

        ) : isFetching ? (
          <div className="mt-20 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            Loading orders...
          </div>

        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center flex flex-col items-center mt-4 shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <Clock3 className="text-slate-400" size={24} />
            </div>
            <h3 className="font-bold text-[14px] text-[#0F172A] mb-1">No Orders Found</h3>
            <p className="text-[11px] text-[var(--color-text-muted)] max-w-[200px] mx-auto leading-relaxed">
              {statusFilter === "all"
                ? "No catering orders to display."
                : `No ${statusFilter} orders right now.`}
            </p>
          </div>

        ) : (
          <div className="space-y-4 mt-2">

            {/* Header row */}
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[14px] font-bold text-[#475569]">
                {statusFilter === "all" ? "All Orders" : `${statusFilter.charAt(0).toUpperCase()}${statusFilter.slice(1)} Orders`}
              </h3>
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[11px] font-bold">
                {filteredBookings.length} Total
              </span>
            </div>

            {/* Cards */}
            {pagedBookings.map((booking) => (
              <div
                key={booking.booking_id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-200 transition-colors"
              >
                <div className="p-5">

                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-[16px] text-[#0F172A] leading-snug">
                        {booking.event_title || booking.fest_title || "Catering Request"}
                      </h3>
                      <p className="text-[12px] font-bold text-[var(--color-primary)] mt-0.5 tracking-tight flex items-center gap-1">
                        <ChefHat size={12} className="opacity-80" />
                        {booking.catering_name || "Unknown Shop"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={12} className="text-slate-400" />
                          {booking.event_date || booking.fest_opening_date
                            ? formatDateShort(booking.event_date || booking.fest_opening_date!)
                            : "No Date"}
                        </span>
                        <span>•</span>
                        <span className="text-slate-400 font-mono text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                          {booking.booking_id}
                        </span>
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      booking.status === "pending"  ? "bg-blue-50 text-blue-600"    :
                      booking.status === "accepted" ? "bg-emerald-50 text-emerald-600" :
                                                      "bg-rose-50 text-rose-600"
                    }`}>
                      {booking.status}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Order Details</p>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[13px] text-slate-700 leading-relaxed">
                        {booking.description || "No specific instructions provided."}
                      </p>
                    </div>
                  </div>

                  {/* Requester Info */}
                  <div className="mb-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Requester Contact</p>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Name</p>
                          <p className="text-[12px] font-bold text-[#0F172A] truncate">
                            {booking.contact_details?.name || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Phone</p>
                          <p className="text-[12px] font-bold text-[#0F172A] truncate">
                            {booking.contact_details?.mobile || booking.contact_details?.phone || booking.contact_details?.contact_number || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Email</p>
                        <p className="text-[12px] font-medium text-slate-600 truncate">
                          {booking.contact_details?.email || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {booking.status === "pending" && (
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleAction(booking.booking_id, "decline")}
                        className="py-3 px-4 border border-rose-200 text-rose-600 rounded-xl text-[13px] font-bold active:bg-rose-50 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAction(booking.booking_id, "accept")}
                        className="py-3 px-4 bg-emerald-600 text-white rounded-xl text-[13px] font-bold shadow-sm active:scale-[0.98] transition-all"
                      >
                        Accept
                      </button>
                    </div>
                  )}

                  {booking.status !== "pending" && (
                    <div className="flex items-center justify-center gap-2 py-2 text-slate-400 text-[12px] font-medium italic bg-slate-50 rounded-lg">
                      {booking.status === "accepted" ? (
                        <><CheckCircle size={14} className="text-emerald-500" /> Order accepted</>
                      ) : (
                        <><XCircle size={14} className="text-rose-500" /> Order declined</>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-5 py-3.5 mt-2 shadow-sm">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold text-slate-600 border border-slate-200 active:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeftIcon size={15} /> Prev
                </button>

                <span className="text-[12px] font-semibold text-slate-500">
                  Page {page} of {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold text-slate-600 border border-slate-200 active:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
