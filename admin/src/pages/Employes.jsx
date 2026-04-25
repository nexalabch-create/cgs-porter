import React from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { useServicesData } from '../hooks/useServices.js';
import { formatCHF, totalChf } from '../lib/format.js';

export default function Employes() {
  const { porters, services, isLoading } = useServicesData();
  const [q, setQ] = React.useState('');

  const stats = React.useMemo(() => {
    const map = new Map();
    const today = new Date('2026-04-25T12:00:00+02:00');
    for (const s of services) {
      const d = new Date(s.scheduled_at);
      if (d.getFullYear() !== today.getFullYear() || d.getMonth() !== today.getMonth()) continue;
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
    if (!ql) return porters;
    return porters.filter(p =>
      `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(ql)
    );
  }, [porters, q]);

  return (
    <>
      <PageHeader
        title="Employés"
        subtitle={isLoading ? 'Chargement…' : `${filtered.length} employé${filtered.length > 1 ? 's' : ''}`}>
        <button className="btn-primary"><UserPlus size={16}/> Ajouter un employé</button>
      </PageHeader>

      <div className="px-8 py-6 space-y-4">
        <div className="card p-4 max-w-md">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
            <input value={q} onChange={(e) => setQ(e.target.value)}
                   placeholder="Rechercher un employé…" className="input pl-9"/>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => {
            const s = stats.get(p.id) || { count: 0, chf: 0 };
            const hours = (s.count * 0.5).toFixed(1); // ~30 min/service estimate
            return (
              <Link
                key={p.id}
                to={`/employes/${p.id}`}
                className="card p-5 hover:shadow-cardHover transition group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-magenta-100 to-magenta-200 text-magenta flex items-center justify-center font-bold">
                    {p.initials || (p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold tracking-tight truncate group-hover:text-magenta transition">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="text-xs text-muted truncate">{p.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`badge ${p.role === 'chef' ? 'bg-navy text-white' : 'bg-slate-100 text-muted'}`}>
                    {p.role === 'chef' ? "Chef d'équipe" : 'Porteur'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                  <Stat value={s.count} label="services"/>
                  <Stat value={hours + 'h'} label="heures"/>
                  <Stat value={formatCHF(s.chf)} label="CA" small/>
                </div>
              </Link>
            );
          })}
        </div>
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
