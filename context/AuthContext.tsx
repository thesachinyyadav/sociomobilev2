"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

  /* Fetch profile from backend */
  const fetchUserData = useCallback(async (email: string) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(email)}`);
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
        await fetch(`${API_URL}/api/users`, {
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
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user?.email) {
        ensureUser(s.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user?.email) ensureUser(s.user);
      else {
        setUserData(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [ensureUser]);

  /* Actions */
  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${APP_URL}/auth/callback` },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserData(null);
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
