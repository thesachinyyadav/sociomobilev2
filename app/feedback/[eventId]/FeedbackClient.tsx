"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/apiClient";
import { ArrowLeftIcon, CheckCircleIcon, AlertCircleIcon, Loader2Icon } from "@/components/icons";
import { motion } from "framer-motion";

const QUESTIONS = [
  "How would you rate the overall event experience?",
  "How relevant and valuable was the content to you?",
  "How well-organized was the event (scheduling, flow, communication)?",
  "How would you rate the venue / platform and logistics?",
  "How likely are you to attend or recommend future events like this?",
];

type PageStatus =
  | "loading"
  | "not_authenticated"
  | "idle"
  | "submitting"
  | "submitted"
  | "already_submitted"
  | "not_registered"
  | "error";

export default function FeedbackClient({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { userData, isLoading: authLoading } = useAuth();
  const [eventTitle, setEventTitle] = useState("");
  const [ratings, setRatings] = useState<(number | null)[]>([null, null, null, null, null]);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // Check registration and submission status + fetch event title
  useEffect(() => {
    if (authLoading) return;
    if (!userData) {
      setStatus("not_authenticated");
      return;
    }

    const init = async () => {
      try {
        const checkData = await apiRequest<any>(`/feedbacks/${eventId}/check`);
        if (checkData.submitted) {
          setStatus("already_submitted");
          return;
        }

        const eventData = await apiRequest<any>(`/events/${eventId}`);
        setEventTitle(
          eventData?.event?.title ||
          eventData?.title ||
          eventData?.events?.[0]?.title ||
          "this event"
        );

        setStatus("idle");
      } catch (err: any) {
        if (err.status === 403) {
          setStatus("not_registered");
        } else {
          setStatus("error");
          setErrorMsg(err.message || "Failed to load feedback form.");
        }
      }
    };

    init();
  }, [userData, authLoading, eventId]);

  const allRated = ratings.every((r) => r !== null);

  const handleRating = (questionIdx: number, value: number) => {
    setRatings((prev) => {
      const next = [...prev];
      next[questionIdx] = value;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!allRated) return;
    setStatus("submitting");

    try {
      await apiRequest<any>(`/feedbacks/${eventId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ratings }),
      });

      setStatus("submitted");
    } catch (err: any) {
      if (err.status === 409) {
        setStatus("already_submitted");
      } else if (err.status === 403) {
        setStatus("not_registered");
      } else {
        setErrorMsg(err.message || "Submission failed. Please try again.");
        setStatus("error");
      }
    }
  };

  // ─── Render states ────────────────────────────────────────────────────────

  if (status === "loading" || authLoading) {
    return (
      <div className="pwa-page-center bg-[#f9fafb]">
        <Loader2Icon className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
        <p className="text-[12px] text-[var(--color-text-muted)] font-medium mt-3 animate-pulse">
          Loading feedback form…
        </p>
      </div>
    );
  }

  if (status === "not_authenticated") {
    return (
      <div className="pwa-page-center px-4 bg-[#f9fafb]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-6 text-center max-w-sm w-full space-y-4"
        >
          <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto text-violet-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-[16px] font-bold text-[var(--color-text)]">Sign in to continue</h2>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            You need to be signed in to submit feedback for this event.
          </p>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("returnTo", window.location.pathname);
              }
              router.replace("/auth");
            }}
            className="btn btn-primary text-[12px] w-full"
          >
            Sign in
          </button>
        </motion.div>
      </div>
    );
  }

  if (status === "already_submitted") {
    return (
      <div className="pwa-page-center px-4 bg-[#f9fafb]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-6 text-center max-w-sm w-full space-y-3"
        >
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-1">
            <CheckCircleIcon size={28} className="text-blue-500" />
          </div>
          <h2 className="text-[16px] font-bold text-[var(--color-text)]">Feedback Completed</h2>
          <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
            You have already submitted feedback for this event. Thank you for helping us improve!
          </p>
          <button
            onClick={() => router.replace("/discover")}
            className="btn btn-primary text-[12px] w-full mt-2"
          >
            Back to Discover
          </button>
        </motion.div>
      </div>
    );
  }

  if (status === "submitted") {
    return (
      <div className="pwa-page-center px-4 bg-[#f9fafb]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-6 text-center max-w-sm w-full space-y-3"
        >
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-1">
            <CheckCircleIcon size={28} className="text-emerald-600 animate-scale-in" />
          </div>
          <h2 className="text-[16px] font-bold text-[var(--color-text)]">Thank you!</h2>
          <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
            Your feedback for <strong className="text-[var(--color-primary-dark)]">{eventTitle}</strong> has been successfully recorded.
          </p>
          <button
            onClick={() => router.replace("/discover")}
            className="btn btn-primary text-[12px] w-full mt-2"
          >
            Back to Discover
          </button>
        </motion.div>
      </div>
    );
  }

  if (status === "not_registered") {
    return (
      <div className="pwa-page-center px-4 bg-[#f9fafb]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-6 text-center max-w-sm w-full space-y-3"
        >
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-1">
            <AlertCircleIcon size={28} className="text-amber-500" />
          </div>
          <h2 className="text-[16px] font-bold text-[var(--color-text)]">Access Restricted</h2>
          <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
            You must be registered for this event to submit a feedback form.
          </p>
          <button
            onClick={() => router.replace("/discover")}
            className="btn btn-primary text-[12px] w-full mt-2"
          >
            Back to Discover
          </button>
        </motion.div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="pwa-page-center px-4 bg-[#f9fafb]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-6 text-center max-w-sm w-full space-y-4"
        >
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <AlertCircleIcon size={28} className="text-red-500" />
          </div>
          <h2 className="text-[16px] font-bold text-[var(--color-text)]">Something went wrong</h2>
          <p className="text-[13px] text-[var(--color-text-muted)]">{errorMsg}</p>
          <div className="flex gap-2">
            <button
              onClick={() => router.replace("/discover")}
              className="btn btn-ghost text-[12px] flex-1"
            >
              Cancel
            </button>
            <button
              onClick={() => { setStatus("loading"); setErrorMsg(""); }}
              className="btn btn-primary text-[12px] flex-1"
            >
              Try again
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Main Form UI ─────────────────────────────────────────────────────────

  return (
    <div className="pwa-page min-h-screen pb-[calc(var(--bottom-nav)+var(--safe-bottom)+32px)] pt-[var(--nav-height)] bg-[#f9fafb] max-w-[420px] mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="bg-[var(--color-primary-dark)] text-white p-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1 rounded-full hover:bg-white/10 active:scale-95 transition-transform"
          aria-label="Go back"
        >
          <ArrowLeftIcon size={18} strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="text-sm font-extrabold tracking-tight">Event Feedback</h1>
          <p className="text-[10px] opacity-75 mt-0.5 line-clamp-1">{eventTitle}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Intro Card */}
        <div className="card p-4 bg-gradient-to-br from-indigo-50/40 to-blue-50/20 border border-blue-100/50">
          <h3 className="text-sm font-bold text-indigo-950 mb-1">Help us improve</h3>
          <p className="text-[12px] text-indigo-900/70 leading-normal">
            Please rate each aspect of the event from 1 (poor) to 5 (excellent). Your response is anonymous and helps organizers create better future events.
          </p>
        </div>

        {/* Questions List */}
        <div className="space-y-3.5">
          {QUESTIONS.map((question, idx) => {
            const hasRating = ratings[idx] !== null;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, ease: "easeOut" }}
                className="card p-4 space-y-3 border border-slate-100 shadow-sm"
              >
                <div className="flex gap-2">
                  <span className="text-[12px] font-black text-indigo-500 bg-indigo-50/50 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-[13px] font-bold text-[var(--color-text)] leading-snug">
                    {question}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {/* Rating Selector */}
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const selected = ratings[idx] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleRating(idx, val)}
                          className={`w-9 h-9 rounded-lg text-xs font-black transition-all border ${
                            selected
                              ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-primary-dark)] shadow-sm scale-105"
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Status Badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 transition-all ${
                    hasRating 
                      ? "bg-emerald-50 text-emerald-700" 
                      : "bg-amber-50 text-amber-600"
                  }`}>
                    {hasRating ? `Rated: ${ratings[idx]}` : "Required"}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Submit Section */}
        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allRated || status === "submitting"}
            className={`w-full h-11 rounded-xl text-[13px] font-black transition-all shadow-sm ${
              allRated && status !== "submitting"
                ? "bg-[var(--color-accent)] text-[var(--color-primary-dark)] active:scale-95"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50"
            }`}
          >
            {status === "submitting" ? "Submitting feedback..." : "Submit Feedback Form"}
          </button>

          {!allRated && (
            <p className="text-center text-[10px] font-semibold text-[var(--color-text-muted)]">
              Please rate all {QUESTIONS.length} aspects before submitting.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
