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
    (async () => {
      if (!isSupabaseConfigured) {
        if (!mounted) return;
        setServices(demo.services);
        setPorters(demo.porters);
        setIsLoading(false);
        return;
      }
      const [{ data: svc }, { data: us }] = await Promise.all([
        supabase.from('services').select('*').order('scheduled_at', { ascending: false }),
        supabase.from('users').select('*'),
      ]);
      if (!mounted) return;
      setServices(svc ?? []);
      setPorters(us ?? []);
      setIsLoading(false);
    })();

    if (!isSupabaseConfigured) return;
    const ch = supabase.channel('admin-services')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        (payload) => setServices((prev) => {
          if (payload.eventType === 'DELETE') return prev.filter(s => s.id !== payload.old.id);
          const idx = prev.findIndex(s => s.id === payload.new.id);
          if (idx === -1) return [payload.new, ...prev];
          const copy = prev.slice(); copy[idx] = payload.new; return copy;
        }))
      .subscribe();
    return () => { mounted = false; ch.unsubscribe(); };
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
