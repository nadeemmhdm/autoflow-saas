import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // Fail loudly in dev rather than silently hitting undefined endpoints.
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill it in."
  );
}

// The anon key is safe to expose in the browser — every table it can touch
// is protected by Row Level Security policies (see supabase/migrations).
// It can NEVER read encrypted access tokens or the webhook_events table.
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
