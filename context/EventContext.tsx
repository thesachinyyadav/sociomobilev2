"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/* ── Types ── */
export interface FetchedEvent {
  event_id: string;
  title: string;
  description: string;
  event_date: string;
  end_date: string | null;
  event_time: string | null;
  venue: string;
  category: string | null;
  registration_fee: number | null;
  participants_per_team: number;
  max_participants: number | null;
  total_participants: number | null;
  event_image_url: string | null;
  banner_url: string | null;
  pdf_url: string | null;
  rules: any;
  schedule: any;
  prizes: any;
  organizer_email: string;
  organizer_phone: string | number | null;
  whatsapp_invite_link: string | null;
  organizing_dept: string | null;
  department_access: any;
  fest: string | null;
  created_by: string | null;
  registration_deadline: string | null;
  allow_outsiders: boolean;
  outsider_registration_fee: number | null;
  outsider_max_participants: number | null;
  custom_fields: any;
  claims_applicable: boolean;
}

export interface Fest {
  id: string | number;
  fest_id: string;
  slug: string;
  fest_title: string;
  description: string;
  opening_date: string;
  closing_date: string;
  fest_image_url: string | null;
  organizing_dept: string | null;
  category: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  event_heads: any;
  venue?: string | null;
  status?: string | null;
  sponsors?: any;
  guests?: any;
  highlights?: any;
  faqs?: any;
  banner_url?: string | null;
  // aliases used by components
  name?: string;
  image_url?: string | null;
  start_date?: string;
  end_date?: string;
  department?: string | null;
}

interface EventCtx {
  allEvents: FetchedEvent[];
  isLoading: boolean;
  error: string | null;
}

const EventContext = createContext<EventCtx>({
  allEvents: [],
  isLoading: false,
  error: null,
});

export const useEvents = () => useContext(EventContext);

export function EventProvider({
  initialEvents = [],
  children,
}: {
  initialEvents?: FetchedEvent[];
  children: ReactNode;
}) {
  const [allEvents] = useState<FetchedEvent[]>(initialEvents);

  return (
    <EventContext.Provider value={{ allEvents, isLoading: false, error: null }}>
      {children}
    </EventContext.Provider>
  );
}
