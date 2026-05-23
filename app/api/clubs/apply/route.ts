import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const club_id = String(body?.club_id ?? "").trim();
    const applicants = body?.applicants;

    if (!club_id || !Array.isArray(applicants)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    // Prefer server-side service role key; fall back to NEXT_PUBLIC_* only for local debugging.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error("Supabase service key or URL missing", { supabaseUrl: !!supabaseUrl, hasKey: !!serviceKey });
      return NextResponse.json({ error: "Supabase service key missing" }, { status: 500 });
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
      // Warn loudly if an insecure public key is being used — remove this from client env immediately.
      console.warn("Using NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in server — this value is client-exposed and insecure. Remove it from client envs.");
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { error } = await supabase
      .from("clubs")
      .update({ clubs_applicants: applicants })
      .eq("club_id", club_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to update applicants" }, { status: 500 });
  }
}
