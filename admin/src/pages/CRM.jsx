import React from 'react';
import { Search } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { useServicesData } from '../hooks/useServices.js';
import {
  formatCHF, formatDate, totalChf, SOURCE_LABEL,
} from '../lib/format.js';

// Aggregates clients from services in real-time. Once the `clients` table is
// populated (e.g. from the Apps Script webhook), this page can switch to
// querying it directly.
export default function CRM() {
  const { services, isLoading } = useServicesData();
  const [q, setQ] = React.useState('');

  const clients = React.useMemo(() => {
    const map = new Map();
    for (const s of services) {
      const key = (s.client_email || s.client_phone || s.client_name || '').toLowerCase();
      if (!key) continue;
      const cur = map.get(key) || {
        name: s.client_name, email: s.client_email, phone: s.client_phone,
        agency: s.agency, source: s.source,
        bookings: 0, totalChf: 0, lastDate: null,
      };
      cur.bookings += 1;
      cur.totalChf += totalChf(s);
      if (!cur.lastDate || new Date(s.scheduled_at) > new Date(cur.lastDate)) {
        cur.lastDate = s.scheduled_at;
      }
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.bookings - a.bookings);
  }, [services]);

  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? clients.filter(c => `${c.name} ${c.email ?? ''} ${c.phone ?? ''}`.toLowerCase().includes(ql))
    : clients;

  return (
    <>
      <PageHeader
        title="CRM Clients"
        subtitle={isLoading ? 'Chargement…' : `${filtered.length} client${filtered.length > 1 ? 's' : ''} unique${filtered.length > 1 ? 's' : ''}`}
      />
      <div className="px-8 py-6 space-y-4">
        <div className="card p-4 max-w-md">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
            <input value={q} onChange={(e) => setQ(e.target.value)}
                   placeholder="Rechercher un client…" className="input pl-9"/>
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 table-head">
              <tr>
                <th>Client</th><th>E-mail</th><th>Téléphone</th>
                <th>Agence</th><th>Source</th>
                <th className="text-right">Réservations</th>
                <th className="text-right">CA total</th>
                <th>Dernier service</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center text-muted py-12">Aucun client.</td></tr>
              )}
              {filtered.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="font-semibold">{c.name}</td>
                  <td className="text-xs text-muted">{c.email ?? '—'}</td>
                  <td className="text-xs text-muted">{c.phone ?? '—'}</td>
                  <td className="text-xs">{c.agency}</td>
                  <td><span className="badge bg-slate-100 text-muted">{SOURCE_LABEL[c.source] ?? c.source}</span></td>
                  <td className="text-right tabular-nums font-semibold">{c.bookings}</td>
                  <td className="text-right tabular-nums font-semibold">{formatCHF(c.totalChf)}</td>
                  <td className="text-xs text-muted">{c.lastDate ? formatDate(c.lastDate) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
