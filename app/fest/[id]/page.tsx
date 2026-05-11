import FestDetailClient from "./FestDetailClient";

export async function generateStaticParams() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing during build-time generateStaticParams");
    return [{ id: "1" }];
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/fests?select=fest_id`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (!res.ok) throw new Error(`Supabase fetch failed: ${res.statusText}`);
    
    const fests = await res.json();
    const params: { id: string }[] = [];
    
    (fests || []).forEach((f: any) => {
      if (f.fest_id) params.push({ id: String(f.fest_id) });
    });
    
    // Return at least one placeholder to satisfy Next.js static export requirements
    return params.length > 0 ? params : [{ id: "1" }];
  } catch (err) {
    console.error("Error generating static params for fests:", err);
    return [{ id: "1" }];
  }
}

export default async function FestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FestDetailClient festId={id} />;
}
