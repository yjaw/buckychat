import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { ApiError, apiFetch } from "../lib/api";

type Profile = {
  id: string;
  email: string;
  status: "active" | "banned";
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  async function refreshProfile() {
    if (!supabaseConfigured) {
      setSession(null);
      setProfile(null);
      setProfileError(null);
      return;
    }

    const { data } = await supabase.auth.getSession();
    setSession(data.session);

    if (!data.session) {
      setProfile(null);
      setProfileError(null);
      return;
    }

    try {
      const next = await apiFetch<Profile>("/api/me");
      setProfile(next);
      setProfileError(null);
    } catch (error) {
      if (!(error instanceof ApiError) && data.session.user.email) {
        setProfile({
          id: data.session.user.id,
          email: data.session.user.email,
          status: "active"
        });
        setProfileError("BuckyChat server is not connected yet.");
        return;
      }

      setProfile(null);
      setProfileError(error instanceof Error ? error.message : "Could not load profile");
    }
  }

  useEffect(() => {
    let alive = true;

    async function initialize() {
      if (!supabaseConfigured) {
        if (alive) {
          setLoading(false);
        }
        return;
      }

      await refreshProfile();
      if (alive) {
        setLoading(false);
      }
    }

    initialize();
    if (!supabaseConfigured) {
      return () => {
        alive = false;
      };
    }

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        refreshProfile();
      } else {
        setProfile(null);
        setProfileError(null);
      }
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileError,
      refreshProfile,
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
      }
    }),
    [session, profile, loading, profileError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
