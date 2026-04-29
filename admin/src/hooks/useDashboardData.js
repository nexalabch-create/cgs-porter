// Single hook that powers Dashboard. Fetches services + porters once, then
// derives metrics, charts and tables in pure functions.
import React from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { demo } from '../lib/demoData.js';
import { totalChf } from '../lib/format.js';

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const sameMonth = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export function useDashboardData() {
  const [services, setServices] = React.useState([]);
  const [porters, setPorters] = React.useState([]);
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

      const [{ data: svcRows }, { data: usersRows }] = await Promise.all([
        supabase.from('services').select('*').order('scheduled_at', { ascending: false }),
        supabase.from('users').select('*'),
      ]);
      if (!mounted) return;
      setServices(svcRows ?? []);
      setPorters(usersRows ?? []);
      setIsLoading(false);
    })();

    return () => { mounted = false; };
  }, []);

  const porterById = React.useMemo(
    () => new Map(porters.map(p => [p.id, p])),
    [porters]
  );

  return React.useMemo(() => {
    // Reference "today" — in demo data, lock to 25-Apr-2026 so charts don't go stale.
    const today = isSupabaseConfigured ? new Date() : new Date('2026-04-25T12:00:00+02:00');

    const todays = services.filter(s => sameDay(new Date(s.scheduled_at), today));
    const month  = services.filter(s => sameMonth(new Date(s.scheduled_at), today));

    const sumChf = (arr) => arr.reduce((acc, s) => acc + totalChf(s), 0);

    const metrics = {
      todayCount: todays.length,
      todayChf:   sumChf(todays),
      monthCount: month.length,
      monthChf:   sumChf(month),
    };

    // Last 30 days bar chart.
    const byDay = [];
    for (let d = 29; d >= 0; d--) {
      const day = new Date(today);
      day.setDate(day.getDate() - d);
      const count = services.filter(s => sameDay(new Date(s.scheduled_at), day)).length;
      byDay.push({
        label: day.toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' }),
        count,
      });
    }

    // Donut by source (this month only).
    const sourceCounts = month.reduce((acc, s) => {
      acc[s.source] = (acc[s.source] || 0) + 1;
      return acc;
    }, {});
    const bySource = ['web', 'dnata', 'swissport', 'prive']
      .filter(k => sourceCounts[k])
      .map(k => ({ source: k, count: sourceCounts[k] }));

    // 5 most-recent today, with porter joined in.
    const recent = todays
      .slice()
      .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
      .slice(0, 5)
      .map(s => ({ ...s, porter: porterById.get(s.assigned_porter_id) }));

    // Top 5 travailleurs this month.
    const stats = new Map();
    for (const s of month) {
      if (s.status !== 'done' || !s.assigned_porter_id) continue;
      const cur = stats.get(s.assigned_porter_id) || { serviceCount: 0, totalChf: 0 };
      cur.serviceCount += 1;
      cur.totalChf += totalChf(s);
      stats.set(s.assigned_porter_id, cur);
    }
    const topPorters = [...stats.entries()]
      .map(([id, v]) => {
        const p = porterById.get(id);
        return p ? { ...p, ...v } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.serviceCount - a.serviceCount)
      .slice(0, 5);

    return { metrics, byDay, bySource, recent, topPorters, isLoading };
  }, [services, porterById, isLoading]);
}
