// useShifts(dateStr) — fetches all shifts on a given day, joined with the
// employee profile, plus the full porter directory for "add employee" UX.
import React from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

export function useShifts(dateStr) {
  const [shifts, setShifts]     = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [isLoading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  React.useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    let mounted = true;

    (async () => {
      setLoading(true);
      const [{ data: rawShifts, error: e1 }, { data: rawUsers, error: e2 }] = await Promise.all([
        supabase
          .from('shifts')
          .select('id, user_id, shift_date, code, starts_at, ends_at, pause_minutes')
          .eq('shift_date', dateStr)
          .order('starts_at', { ascending: true }),
        supabase
          .from('users')
          .select('id, email, role, first_name, last_name, initials, cgs_employee_id')
          .order('last_name', { ascending: true }),
      ]);
      if (!mounted) return;
      if (e1) console.warn('[useShifts] shifts fetch', e1);
      if (e2) console.warn('[useShifts] users fetch', e2);

      const userById = new Map((rawUsers || []).map(u => [u.id, u]));
      const enriched = (rawShifts || []).map(s => ({ ...s, user: userById.get(s.user_id) }));
      setShifts(enriched);
      setEmployees(rawUsers || []);
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [dateStr, refreshKey]);

  const upsertShift = async (row) => {
    if (!isSupabaseConfigured) return { error: 'no supabase' };
    const payload = {
      user_id: row.user_id,
      shift_date: row.shift_date,
      code: row.code,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      pause_minutes: Number(row.pause_minutes) || 0,
    };
    const { error } = await supabase
      .from('shifts')
      .upsert(payload, { onConflict: 'user_id,shift_date' });
    if (!error) refresh();
    return { error };
  };

  const insertMany = async (rows) => {
    if (!isSupabaseConfigured) return { error: 'no supabase' };
    const { error, data } = await supabase
      .from('shifts')
      .upsert(rows, { onConflict: 'user_id,shift_date' })
      .select('id');
    if (!error) refresh();
    return { error, count: data?.length ?? 0 };
  };

  const deleteShift = async (id) => {
    if (!isSupabaseConfigured) return { error: 'no supabase' };
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (!error) refresh();
    return { error };
  };

  return { shifts, employees, isLoading, upsertShift, insertMany, deleteShift, refresh };
}
