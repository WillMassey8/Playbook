import { createClient } from "@supabase/supabase-js";

// Project URL + publishable (anon) key. Safe to ship in the client — access is
// governed by row-level security. Overridable via Vercel env vars.
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://riwjijzjqfdsfocnzria.supabase.co";

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "sb_publishable_dDyrNmILRObvGMTsDTLb2g_uj94nVXj";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
