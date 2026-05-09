import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase env vars missing — auth will not work");
}

const isApp = typeof window !== "undefined" && (Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'web');

console.log("🛠️ [SupabaseClient] Initialization:", {
  isNative: isApp,
  platform: typeof window !== "undefined" ? Capacitor.getPlatform() : "SSR",
  supabaseUrl: !!supabaseUrl,
  flowType: isApp ? "implicit" : "pkce"
});

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !isApp,
      flowType: isApp ? "implicit" : "pkce",
    },
    realtime: {
      reconnectAfterMs: (tries: number) => ([2000, 5000, 15000, 30000][tries] ?? 1_800_000),
    },
  }
);
