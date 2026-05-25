import { supabase } from "@/lib/supabaseClient";
import { API_BASE, APP_URL } from "@/lib/apiConfig";

/**
 * Web Authentication Strategy
 *
 * Uses the standard Supabase OAuth flow which defaults to PKCE.
 * Suitable for Desktop Browsers, Mobile Browsers, and PWA installs.
 */
export async function signInWithGoogleWeb() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Redirect to the backend callback, passing the current origin so it knows where to return
      redirectTo: `${API_BASE}/api/auth/callback?next=${encodeURIComponent(APP_URL)}`,
    },
  });
  if (error) throw error;
  
  // Note: On web, supabase.auth.signInWithOAuth automatically handles the redirect 
  // unless skipBrowserRedirect: true is passed.
  return data;
}
