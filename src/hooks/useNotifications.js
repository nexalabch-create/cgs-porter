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
            setNotifications((prev) => [n, ...prev].slice(0, 50));
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

    return () => {
      mounted = false;
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

  return { notifications, unreadCount, markRead, markAllRead, latestUnseen, dismissLatest };
}
