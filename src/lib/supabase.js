// Supabase singleton client. Returns null when env vars are missing so the app
// gracefully degrades to local SAMPLE data (demo mode).
//
// To enable real persistence:
//   1. cp .env.example .env.local
//   2. fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
//   3. npm install @supabase/supabase-js
//   4. restart `npm run dev`
//
// Skill: supabase-postgres-best-practices · conn-pooling — anon key uses the
// supavisor pooler URL automatically; no extra config needed for browser apps.

let _client = null;
let _initPromise = null;

export const supabaseEnv = {
  url:     import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

export const isSupabaseConfigured = () =>
  Boolean(supabaseEnv.url && supabaseEnv.anonKey);

// Lazy import so the @supabase/supabase-js bundle isn't loaded in demo mode.
// (Skill: vercel-react-best-practices · bundle-conditional + bundle-dynamic-imports)
export async function getSupabase() {
  if (_client) return _client;
  if (!isSupabaseConfigured()) return null;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      _client = createClient(supabaseEnv.url, supabaseEnv.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
        realtime: { params: { eventsPerSecond: 5 } },
      });
      return _client;
    } catch (err) {
      console.warn('[supabase] client init failed — running in demo mode.', err);
      return null;
    }
  })();

  return _initPromise;
}
