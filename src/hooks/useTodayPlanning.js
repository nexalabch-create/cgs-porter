// useTodayPlanning(userId) — fetches today's shifts (with employee profiles) +
// the current user's own shift. Used on mobile ChefHome and PorterHome.
import React from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase.js';

const todayIsoLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function useTodayPlanning(userId) {
  const [team, setTeam] = React.useState([]); // [{shift, user}]
  const [myShift, setMyShift] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isSupabaseConfigured() || !userId) return;
    let mounted = true;
    setIsLoading(true);

    (async () => {
      const sb = await getSupabase();
      if (!sb || !mounted) { setIsLoading(false); return; }

      const date = todayIsoLocal();
      const { data: shifts, error: e1 } = await sb
        .from('shifts')
        .select('id, user_id, code, starts_at, ends_at, pause_minutes')
        .eq('shift_date', date)
        .order('starts_at', { ascending: true });

      if (e1 || !shifts) { setIsLoading(false); return; }

      // Try to fetch user profiles. RLS allows chef to read all users; porter
      // can only read their own row (so the team list will only contain self).
      const userIds = [...new Set(shifts.map(s => s.user_id))];
      let users = [];
      if (userIds.length) {
        const { data } = await sb
          .from('users')
          .select('id, first_name, last_name, initials, role, cgs_employee_id')
          .in('id', userIds);
        users = data || [];
      }
      const byId = new Map(users.map(u => [u.id, u]));

      if (!mounted) return;
      const enriched = shifts.map(s => ({ ...s, user: byId.get(s.user_id) }));
      setTeam(enriched);
      setMyShift(enriched.find(s => s.user_id === userId) || null);
      setIsLoading(false);
    })();

    return () => { mounted = false; };
  }, [userId]);

  return { team, myShift, isLoading };
}
