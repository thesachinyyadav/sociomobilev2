"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

/* ── Local-storage helpers for PWA session persistence ── */
const LS_SESSION_KEY = "socio_pwa_session";

function persistSessionToLS(session: Session | null) {
  try {
    if (session) {
      localStorage.setItem(LS_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(LS_SESSION_KEY);
    }
  } catch {}
}

function restoreSessionFromLS(): Session | null {
  try {
    const raw = localStorage.getItem(LS_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    localStorage.removeItem(LS_SESSION_KEY);
    return null;
  }
}

/* ── Types ── */
export interface UserData {
  id: number | string;
  email: string;
  name: string;
  register_number: string | null;
  course: string | null;
  department: string | null;
  campus: string | null;
  avatar_url: string | null;
  is_organiser: boolean;
  is_support: boolean;
  is_masteradmin: boolean;
  organization_type: "christ_member" | "outsider";
  visitor_id: string | null;
  outsider_name_edit_used: boolean;
  created_at: string;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  userData: UserData | null;
  isLoading: boolean;
  needsCampus: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  session: null,
  user: null,
  userData: null,
  isLoading: true,
  needsCampus: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshUserData: async () => {},
});

export const useAuth = () => useContext(AuthContext);


function getOrgType(email: string): "christ_member" | "outsider" {
  return email.toLowerCase().endsWith("christuniversity.in")
    ? "christ_member"
    : "outsider";
}

/* ── Provider ── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Schedule a proactive token refresh 60 s before the access token expires */
  const scheduleTokenRefresh = useCallback((s: Session | null) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (!s) return;

    const expiresAt = s.expires_at; // unix seconds
    if (!expiresAt) return;

    const msUntilExpiry = expiresAt * 1000 - Date.now() - 60_000; // 60 s buffer
    if (msUntilExpiry <= 0) {
      // Already (almost) expired — refresh now
      supabase.auth.refreshSession();
      return;
    }

    refreshTimerRef.current = setTimeout(() => {
      supabase.auth.refreshSession();
    }, msUntilExpiry);
  }, []);

  /* Fetch profile from backend */
  const fetchUserData = useCallback(async (email: string) => {
    try {
      const res = await fetch(`/api/pwa/users/${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setUserData(data.user ?? data);
      }
    } catch (e) {
      console.error("Failed to fetch user data", e);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (user?.email) await fetchUserData(user.email);
  }, [user, fetchUserData]);

  /* Create / update user on first login */
  const ensureUser = useCallback(
    async (supaUser: User) => {
      const email = supaUser.email!;
      const orgType = getOrgType(email);
      let fullName =
        supaUser.user_metadata?.full_name ||
        supaUser.user_metadata?.name ||
        "";
      let registerNumber: string | null = null;
      let course: string | null = null;

      if (orgType === "christ_member") {
        const domain = email.split("@")[1] || "";
        const sub = domain.split(".")[0]?.toUpperCase();
        if (sub && sub !== "CHRISTUNIVERSITY") course = sub;
        const lastName = supaUser.user_metadata?.last_name?.trim();
        if (lastName && /^\d+$/.test(lastName)) {
          registerNumber = lastName;
        } else if (fullName) {
          const parts = fullName.split(" ");
          const last = parts[parts.length - 1]?.trim();
          if (/^\d+$/.test(last || "")) {
            registerNumber = last!;
            fullName = parts.slice(0, -1).join(" ");
          }
        }
      }

      try {
        await fetch(`/api/pwa/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: {
              id: supaUser.id,
              email,
              name: fullName || email.split("@")[0],
              avatar_url: supaUser.user_metadata?.avatar_url,
              register_number: registerNumber,
              course,
            },
          }),
        });
      } catch {}

      await fetchUserData(email);
    },
    [fetchUserData]
  );

  /* Auth state listener */
  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      // 1. Try Supabase cookie-based session first
      const { data: { session: s } } = await supabase.auth.getSession();

      if (s?.user?.email) {
        if (mounted) {
          setSession(s);
          setUser(s.user);
          persistSessionToLS(s);
          scheduleTokenRefresh(s);
        }
        await ensureUser(s.user);
        if (mounted) setIsLoading(false);
        return;
      }

      // 2. Cookie session missing — try localStorage backup (PWA standalone)
      const lsSession = restoreSessionFromLS();
      if (lsSession?.refresh_token) {
        const { data: refreshed } = await supabase.auth.setSession({
          access_token: lsSession.access_token,
          refresh_token: lsSession.refresh_token,
        });

        if (refreshed.session?.user?.email && mounted) {
          setSession(refreshed.session);
          setUser(refreshed.session.user);
          persistSessionToLS(refreshed.session);
          scheduleTokenRefresh(refreshed.session);
          await ensureUser(refreshed.session.user);
          setIsLoading(false);
          return;
        }
      }

      // 3. No valid session anywhere
      if (mounted) {
        persistSessionToLS(null);
        setIsLoading(false);
      }
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      persistSessionToLS(s);
      scheduleTokenRefresh(s);

      if (s?.user?.email) ensureUser(s.user);
      else {
        setUserData(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [ensureUser, scheduleTokenRefresh]);

  /* Actions */
  const signInWithGoogle = useCallback(async () => {
    const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${runtimeOrigin}/auth/callback` },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserData(null);
    persistSessionToLS(null);
  }, []);

  /* Derived: show campus selector for christ members without campus */
  const needsCampus =
    !isLoading &&
    !!userData &&
    userData.organization_type === "christ_member" &&
    !userData.campus;

  return (
    <AuthContext.Provider
      value={{ session, user, userData, isLoading, needsCampus, signInWithGoogle, signOut, refreshUserData }}
    >
      {children}
    </AuthContext.Provider>
  );
}
