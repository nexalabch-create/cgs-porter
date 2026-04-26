// useServices — single source of truth for the services list.
//
// Behaviour:
//   · If Supabase env vars are present, fetch services and subscribe to realtime
//     UPDATE/INSERT/DELETE events on the public.services table.
//   · Otherwise, fall back to the in-memory SAMPLE so the app stays usable in
//     dev/demo mode without backend setup.
//
// Skills applied:
//   · vercel-react-best-practices · async-parallel — auth + initial fetch run together
//   · vercel-react-best-practices · client-event-listeners — realtime channel cleaned up on unmount
//   · supabase-postgres-best-practices · query-composite-indexes — the porter-day index
//     services_porter_day_idx serves the porter's `assigned_porter_id` filter
//   · supabase-postgres-best-practices · data-pagination — services list is naturally bounded
//     to one shift/day, no need for cursor pagination
import React from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase.js';
import { totalChfFor } from '../lib/pricing.js';

// uuid-format regex used to validate inputs to assignPorter — prevents the
// stale-fallback race in AssignSheet from silently dropping the UPDATE.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Field translation: DB snake_case → camelCase used by the React UI.
const fromRow = (r) => ({
  id: r.id,
  flight: r.flight,
  time: new Date(r.scheduled_at).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }),
  client: r.client_name,
  meeting: r.meeting_point,
  bags: r.bags,
  source: r.source,
  // Tier-based pricing: depends on source + bags. See src/lib/pricing.js.
  price: totalChfFor({ source: r.source, bags: r.bags }),
  status: r.status,
  agency: r.agency,
  phone: r.client_phone,
  flow: r.flow === 'arrivee' ? 'Arrivée' : 'Départ',
  remarques: r.remarques ?? '',
  elapsed: r.elapsed_seconds ?? 0,
  assignedPorterId: r.assigned_porter_id,
});

export function useServices(initial = []) {
  const [services, setServices] = React.useState(initial);
  const [isOnline, setIsOnline] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(isSupabaseConfigured());

  React.useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let channel;
    let mounted = true;
    let authSub;

    const fetchAndSubscribe = async () => {
      const sb = await getSupabase();
      if (!sb || !mounted) { setIsLoading(false); return; }

      // Re-fetch with current session — RLS uses auth.uid().
      const { data, error } = await sb
        .from('services')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (!mounted) return;

      if (error) {
        console.warn('[useServices] fetch failed', error);
        setIsLoading(false);
        return;
      }

      setServices(data.map(fromRow));
      setIsOnline(true);
      setIsLoading(false);

      // Drop the old realtime channel (token rotated on login) and resubscribe.
      if (channel) { channel.unsubscribe(); channel = null; }
      channel = sb
        .channel('services-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'services' },
          (payload) => {
            setServices((prev) => {
              if (payload.eventType === 'DELETE') {
                return prev.filter((s) => s.id !== payload.old.id);
              }
              const next = fromRow(payload.new);
              const idx = prev.findIndex((s) => s.id === next.id);
              if (idx === -1) return [...prev, next];
              const copy = prev.slice();
              copy[idx] = next;
              return copy;
            });
          })
        .subscribe();
    };

    (async () => {
      const sb = await getSupabase();
      if (!sb || !mounted) return;
      // Initial fetch (anon at boot, RLS will filter).
      await fetchAndSubscribe();
      // Re-fetch + re-subscribe whenever auth session flips (login/logout)
      // so RLS picks up the new auth.uid().
      const { data } = sb.auth.onAuthStateChange((_evt, _session) => {
        fetchAndSubscribe();
      });
      authSub = data?.subscription;
    })();

    return () => {
      mounted = false;
      if (channel) channel.unsubscribe();
      if (authSub) authSub.unsubscribe();
    };
  }, []);

  // Mutations — write through to Supabase when online; always update local state
  // optimistically so the UI feels instant.
  const assignPorter = React.useCallback(async (serviceId, porterId) => {
    // Defensive validation: assigned_porter_id is uuid in BD. If a string
    // demo ID slipped through (race condition with useUsers), bail out
    // visibly instead of optimistically lying to the UI.
    if (isOnline && !UUID_RE.test(String(porterId))) {
      console.warn('[useServices] refused non-UUID porterId:', porterId);
      return { error: 'invalid_porter_id', detail: `expected UUID, got "${porterId}"` };
    }
    setServices((arr) => arr.map((s) => s.id === serviceId ? { ...s, assignedPorterId: porterId } : s));
    if (!isOnline) return { ok: true };
    const sb = await getSupabase();
    if (!sb) return { ok: true };
    const { error } = await sb
      .from('services')
      .update({ assigned_porter_id: porterId })
      .eq('id', serviceId);
    if (error) {
      // Roll back the optimistic update so UI matches reality.
      setServices((arr) => arr.map((s) => s.id === serviceId ? { ...s, assignedPorterId: null } : s));
      console.warn('[useServices] assign failed', error);
      return { error: error.code || 'assign_failed', detail: error.message };
    }
    return { ok: true };
  }, [isOnline]);

  const updateService = React.useCallback(async (data) => {
    setServices((arr) => arr.map((s) => s.id === data.id ? data : s));
    if (!isOnline) return;
    const sb = await getSupabase();
    if (!sb) return;
    const { error } = await sb
      .from('services')
      .update({
        bags: data.bags,
        status: data.status,
        remarques: data.remarques,
        started_at:   data.status === 'active' ? new Date().toISOString() : undefined,
        completed_at: data.status === 'done'   ? new Date().toISOString() : undefined,
      })
      .eq('id', data.id);
    if (error) console.warn('[useServices] update failed', error);
  }, [isOnline]);

  return { services, setServices, assignPorter, updateService, isOnline, isLoading };
}
