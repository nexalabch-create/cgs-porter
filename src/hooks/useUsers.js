// useUsers — fetches all `public.users` rows (chefs + porters) from Supabase.
// Used by AssignSheet so the chef can assign services to REAL users (UUID-based)
// instead of the static demo PORTERS array (string IDs that fail BD UPDATE).
//
// Falls back to an empty array when Supabase isn't configured — AssignSheet
// then uses its existing static PORTERS fallback.
import React from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase.js';

const fromRow = (r) => ({
  id: r.id,                           // ← real UUID
  email: r.email,
  firstName: r.first_name,
  lastName: r.last_name,
  role: r.role,
  initials: r.initials || ((r.first_name?.[0] || '') + (r.last_name?.[0] || '')),
});

export function useUsers() {
  const [users, setUsers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(isSupabaseConfigured());

  React.useEffect(() => {
    if (!isSupabaseConfigured()) { setIsLoading(false); return; }

    let mounted = true;

    const fetchOnce = async () => {
      const sb = await getSupabase();
      if (!sb || !mounted) return;
      const { data, error } = await sb
        .from('users')
        .select('id, email, first_name, last_name, role, initials')
        .in('role', ['porter', 'chef'])
        .order('role', { ascending: false })   // chefs first (alphabetical 'c' < 'p')
        .order('first_name', { ascending: true });
      if (!mounted) return;
      if (error) { console.warn('[useUsers] fetch failed', error); setIsLoading(false); return; }
      setUsers(data.map(fromRow));
      setIsLoading(false);
    };

    fetchOnce();

    // Re-fetch on auth state change so RLS picks up the new session.
    let authSub;
    (async () => {
      const sb = await getSupabase();
      if (!sb) return;
      const { data } = sb.auth.onAuthStateChange((_evt) => fetchOnce());
      authSub = data?.subscription;
    })();

    return () => { mounted = false; authSub?.unsubscribe(); };
  }, []);

  return { users, isLoading };
}
