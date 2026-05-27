import FeedbackClient from "./FeedbackClient";

export async function generateStaticParams() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing during build-time generateStaticParams");
    return [{ eventId: "1" }];
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/events?select=event_id`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (!res.ok) throw new Error(`Supabase fetch failed: ${res.statusText}`);
    
    const events = await res.json();
    const params = (events || []).map((e: any) => ({
      eventId: String(e.event_id),
    }));

    return params.length > 0 ? params : [{ eventId: "1" }];
  } catch (err) {
    console.error("Error generating static params for event feedback:", err);
    return [{ eventId: "1" }];
  }
}

export default async function FeedbackPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <FeedbackClient eventId={eventId} />;
}
