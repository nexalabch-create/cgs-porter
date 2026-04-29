// Shared services data hook for admin pages. Read-write.
import React from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { demo } from '../lib/demoData.js';

export function useServicesData() {
  const [services, setServices] = React.useState([]);
  const [porters,  setPorters]  = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    let ch = null;
    let pollId = null;
    let visHandler = null;

    // Re-fetch helper — used on initial load, polling tick, and on tab focus.
    // Querying both tables in parallel keeps the admin under 200ms even on
    // a flaky network. Updates are deduped against current state by `id`,
    // so concurrent realtime events don't fight the polling result.
    const fetchAll = async () => {
      if (!mounted) return;
      try {
        const [{ data: svc }, { data: us }] = await Promise.all([
          supabase.from('services').select('*').order('scheduled_at', { ascending: false }),
          supabase.from('users').select('*'),
        ]);
        if (!mounted) return;
        if (svc) setServices(svc);
        if (us)  setPorters(us);
      } catch (err) {
        console.warn('[admin useServices] fetch failed', err);
      }
    };

    (async () => {
      if (!isSupabaseConfigured) {
        if (!mounted) return;
        setServices(demo.services);
        setPorters(demo.porters);
        setIsLoading(false);
        return;
      }
      await fetchAll();
      if (!mounted) return;
      setIsLoading(false);
    })();

    if (!isSupabaseConfigured) return;

    // Realtime channel — primary delivery mechanism. Falls back to polling
    // below when the websocket drops a packet (which DOES happen on chef-
    // office wifi during the airport's 6am surge). Was the actual cause
    // of "j'ai mis Marc en cours mais le dashboard est resté à À FAIRE"
    // when Marc tapped Démarrer/Terminer twice in quick succession.
    ch = supabase.channel('admin-services')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        (payload) => setServices((prev) => {
          if (payload.eventType === 'DELETE') return prev.filter(s => s.id !== payload.old.id);
          const idx = prev.findIndex(s => s.id === payload.new.id);
          if (idx === -1) return [payload.new, ...prev];
          const copy = prev.slice(); copy[idx] = payload.new; return copy;
        }))
      .subscribe();

    // Polling fallback — re-fetch every 5 s. Realtime usually beats it but
    // when realtime fails silently this guarantees the chef sees Marc's
    // status changes within 5 s worst-case (was forever — bug reported
    // 2026-04-29: "Marc terminó pero sigue EN COURS en mi dashboard").
    pollId = setInterval(fetchAll, 5000);

    // When the chef switches back to this tab after focusing another app
    // (Slack, email, the daily-services PDF), force an immediate re-fetch.
    // The realtime websocket is often suspended in background tabs on
    // macOS Safari, so the dashboard would otherwise look stale on return.
    visHandler = () => { if (document.visibilityState === 'visible') fetchAll(); };
    document.addEventListener('visibilitychange', visHandler);

    return () => {
      mounted = false;
      if (ch) ch.unsubscribe();
      if (pollId) clearInterval(pollId);
      if (visHandler) document.removeEventListener('visibilitychange', visHandler);
    };
  }, []);

  const porterById = React.useMemo(() => new Map(porters.map(p => [p.id, p])), [porters]);

  const insert = async (row) => {
    if (!isSupabaseConfigured) {
      const r = { ...row, id: 'demo-' + Math.random().toString(36).slice(2, 8), created_at: new Date().toISOString() };
      setServices(prev => [r, ...prev]);
      return { data: r };
    }
    const { data, error } = await supabase.from('services').insert(row).select().single();
    return { data, error };
  };

  const update = async (id, patch) => {
    if (!isSupabaseConfigured) {
      setServices(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
      return {};
    }
    const { error } = await supabase.from('services').update(patch).eq('id', id);
    return { error };
  };

  const remove = async (id) => {
    if (!isSupabaseConfigured) {
      setServices(prev => prev.filter(s => s.id !== id));
      return {};
    }
    const { error } = await supabase.from('services').delete().eq('id', id);
    return { error };
  };

  return { services, porters, porterById, isLoading, insert, update, remove };
}
