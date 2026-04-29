// useNotifications — fetches the current user's notifications + subscribes
// to realtime INSERT events so a notification pops in as soon as it lands
// in the BD (chef assigns → porter sees it within ~200ms).
//
// Returns { notifications, unreadCount, markAllRead(), markRead(id) }.
import React from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase.js';

const fromRow = (r) => ({
  id: r.id,
  type: r.type,
  payload: r.payload || {},
  serviceId: r.service_id,
  actorId: r.actor_id,
  readAt: r.read_at,
  createdAt: new Date(r.created_at),
});

export function useNotifications(userId) {
  const [notifications, setNotifications] = React.useState([]);
  const [latestUnseen, setLatestUnseen] = React.useState(null);

  React.useEffect(() => {
    if (!isSupabaseConfigured() || !userId) return;
    let mounted = true;
    let channel;

    (async () => {
      const sb = await getSupabase();
      if (!sb || !mounted) return;

      // Initial fetch — last 50 notifications, newest first.
      const { data, error } = await sb
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!mounted) return;
      if (error) { console.warn('[useNotifications] fetch failed', error); return; }
      setNotifications(data.map(fromRow));

      // Realtime — subscribe to INSERTs for this recipient.
      channel = sb
        .channel(`notifications-${userId}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
          (payload) => {
            const n = fromRow(payload.new);
            setNotifications((prev) => {
              if (prev.some(x => x.id === n.id)) return prev;  // dedupe vs polling
              return [n, ...prev].slice(0, 50);
            });
            setLatestUnseen(n);   // for the toast pop-up
          })
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
          (payload) => {
            const n = fromRow(payload.new);
            setNotifications((prev) => prev.map((x) => x.id === n.id ? n : x));
          })
        .subscribe();
    })();

    // Polling fallback — every 8 s, re-fetch the notifications list. If
    // realtime delivered, the new rows are already there and pollFetch
    // becomes a no-op via dedupe. If realtime didn't deliver (offline tab,
    // SW caching, ISP throttling, expired socket), polling guarantees
    // delivery within ~8 s. Bullet-proof at the cost of one tiny query
    // every 8 s per logged-in porter.
    const pollFetch = async () => {
      const sb2 = await getSupabase();
      if (!sb2 || !mounted) return;
      const { data, error } = await sb2
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!mounted || error) return;
      setNotifications((prev) => {
        const prevIds = new Set(prev.map(p => p.id));
        const incoming = data.map(fromRow);
        // Detect brand-new rows (not yet seen) → fire toast for the latest.
        const newOnes = incoming.filter(n => !prevIds.has(n.id) && !n.readAt);
        if (newOnes.length > 0) setLatestUnseen(newOnes[0]);
        // Merge: keep newest first, capped at 50.
        const merged = [...incoming, ...prev.filter(p => !incoming.some(n => n.id === p.id))];
        return merged.slice(0, 50);
      });
    };
    const pollId = setInterval(pollFetch, 8000);

    return () => {
      mounted = false;
      clearInterval(pollId);
      if (channel) channel.unsubscribe();
    };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markRead = React.useCallback(async (id) => {
    setNotifications((arr) => arr.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    if (!isSupabaseConfigured()) return;
    const sb = await getSupabase();
    if (!sb) return;
    await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  }, []);

  const markAllRead = React.useCallback(async () => {
    const now = new Date().toISOString();
    setNotifications((arr) => arr.map((n) => n.readAt ? n : { ...n, readAt: now }));
    if (!isSupabaseConfigured() || !userId) return;
    const sb = await getSupabase();
    if (!sb) return;
    await sb.from('notifications')
      .update({ read_at: now })
      .eq('recipient_id', userId)
      .is('read_at', null);
  }, [userId]);

  const dismissLatest = React.useCallback(() => setLatestUnseen(null), []);

  // Delete a single notification — removes from the recipient's view.
  // Optimistic local update; BD delete via RLS (recipient can delete own).
  const remove = React.useCallback(async (id) => {
    setNotifications((arr) => arr.filter((n) => n.id !== id));
    if (!isSupabaseConfigured()) return;
    const sb = await getSupabase();
    if (!sb) return;
    await sb.from('notifications').delete().eq('id', id);
  }, []);

  // Clear all notifications for this user.
  const clearAll = React.useCallback(async () => {
    setNotifications([]);
    if (!isSupabaseConfigured() || !userId) return;
    const sb = await getSupabase();
    if (!sb) return;
    await sb.from('notifications').delete().eq('recipient_id', userId);
  }, [userId]);

  return {
    notifications, unreadCount,
    markRead, markAllRead, remove, clearAll,
    latestUnseen, dismissLatest,
  };
}
