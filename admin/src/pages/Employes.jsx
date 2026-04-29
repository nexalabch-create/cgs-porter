import React from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { useServicesData } from '../hooks/useServices.js';
import { formatCHF, totalChf } from '../lib/format.js';

export default function Employes() {
  const { porters, services, isLoading } = useServicesData();
  const [q, setQ] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all'); // all | chef | porter

  const stats = React.useMemo(() => {
    const map = new Map();
    // Aggregate by current calendar month so the cards always show fresh data
    // — the previous hardcoded date showed 0 for everyone after April.
    const now = new Date();
    const yr = now.getFullYear(), mo = now.getMonth();
    for (const s of services) {
      const d = new Date(s.scheduled_at);
      if (d.getFullYear() !== yr || d.getMonth() !== mo) continue;
      if (!s.assigned_porter_id) continue;
      const cur = map.get(s.assigned_porter_id) || { count: 0, chf: 0 };
      cur.count += 1;
      cur.chf += totalChf(s);
      map.set(s.assigned_porter_id, cur);
    }
    return map;
  }, [services]);

  const filtered = React.useMemo(() => {
    const ql = q.trim().toLowerCase();
    return porters
      .filter(p => roleFilter === 'all' ? true : p.role === roleFilter)
      .filter(p => !ql || `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(ql));
  }, [porters, q, roleFilter]);

  const counts = React.useMemo(() => ({
    all: porters.length,
    chef: porters.filter(p => p.role === 'chef').length,
    porter: porters.filter(p => p.role === 'porter').length,
  }), [porters]);

  return (
    <>
      {/* "Ajouter un employé" CTA removed pre-launch — was a no-op button.
          Onboarding new employees needs a Supabase Auth invite flow that
          isn't built yet; rather than ship a broken click target, hide the
          button entirely. Re-add when create-employee modal lands. */}
      <PageHeader
        title="Employés"
        subtitle={isLoading ? 'Chargement…' : `${filtered.length} employé${filtered.length > 1 ? 's' : ''}`}/>

      <div className="px-8 py-6 space-y-4">
        {/* Filter bar — search + role tabs side by side. */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="card p-2 flex-1 max-w-md">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
              <input value={q} onChange={(e) => setQ(e.target.value)}
                     placeholder="Rechercher un employé…" className="input pl-9 border-0 shadow-none"/>
            </div>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {[
              { id: 'all',    label: `Tous (${counts.all})` },
              { id: 'chef',   label: `Chefs (${counts.chef})` },
              { id: 'porter', label: `Travailleurs (${counts.porter})` },
            ].map(r => (
              <button key={r.id} onClick={() => setRoleFilter(r.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold tracking-tight transition
                  ${roleFilter === r.id
                    ? 'bg-white text-magenta shadow-sm'
                    : 'text-muted hover:text-ink'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card grid — capped at 3 cols (xl) so each card has breathing room.
            Cards stack to 1 col on mobile, 2 on md, 3 on xl. The previous
            4-col grid made names + emails truncate awkwardly. */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const s = stats.get(p.id) || { count: 0, chf: 0 };
            const hours = (s.count * 0.5).toFixed(1); // ~30 min/service estimate
            const initials = p.initials || ((p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')).toUpperCase();
            const isChef = p.role === 'chef';
            return (
              <Link
                key={p.id}
                to={`/employes/${p.id}`}
                className="card p-5 hover:shadow-cardHover transition group">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold flex-shrink-0
                    ${isChef
                      ? 'bg-gradient-to-br from-navy to-navy-700 text-white'
                      : 'bg-gradient-to-br from-magenta-100 to-magenta-200 text-magenta'}`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold tracking-tight truncate group-hover:text-magenta transition">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="text-xs text-muted truncate" title={p.email}>{p.email}</div>
                    <div className="mt-1.5">
                      <span className={`badge ${isChef ? 'bg-navy text-white' : 'bg-slate-100 text-muted'}`}>
                        {isChef ? "Chef d'équipe" : 'Travailleur'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                  <Stat value={s.count} label="services"/>
                  <Stat value={hours + 'h'} label="heures"/>
                  <Stat value={formatCHF(s.chf)} label="ce mois" small/>
                </div>
              </Link>
            );
          })}
        </div>

        {!isLoading && filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-muted">Aucun employé ne correspond aux filtres.</div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function Stat({ value, label, small = false }) {
  return (
    <div>
      <div className={`font-display font-semibold tabular-nums tracking-tight ${small ? 'text-sm' : 'text-base'}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase font-bold tracking-wider text-muted mt-0.5">{label}</div>
    </div>
  );
}
