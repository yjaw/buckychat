import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const authRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigIssues = [
  !supabaseUrl ? "VITE_SUPABASE_URL" : null,
  !supabaseAnonKey ? "VITE_SUPABASE_ANON_KEY" : null
].filter(Boolean) as string[];

const fallbackSupabaseUrl = "http://localhost:54321";
const fallbackAnonKey = "missing-anon-key";

export const supabase = createClient(
  supabaseUrl ?? fallbackSupabaseUrl,
  supabaseAnonKey ?? fallbackAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export function getAuthRedirectTo() {
  if (authRedirectUrl?.trim()) {
    return authRedirectUrl.trim();
  }

  return `${window.location.origin}/auth/callback`;
}
