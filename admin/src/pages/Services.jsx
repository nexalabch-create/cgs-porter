import React from 'react';
import { Plus, Search, Pencil, Trash2, Download, ArrowUpDown } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import ServiceModal from '../components/ServiceModal.jsx';
import { useServicesData } from '../hooks/useServices.js';
import {
  formatCHF, formatDate, formatTime, totalChf,
  STATUS_LABEL, STATUS_STYLES, SOURCE_LABEL, shortName,
} from '../lib/format.js';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = ['', 'todo', 'active', 'done'];
const SOURCE_OPTIONS = ['', 'web', 'dnata', 'swissport', 'prive'];

export default function Services() {
  const { services, porters, porterById, isLoading, insert, update, remove } = useServicesData();

  const [q, setQ] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [sourceFilter, setSourceFilter] = React.useState('');
  const [porterFilter, setPorterFilter] = React.useState('');
  const [sortKey, setSortKey] = React.useState('scheduled_at');
  const [sortDir, setSortDir] = React.useState('desc');
  const [page, setPage] = React.useState(1);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing,   setEditing]   = React.useState(null);
  const [deletingId, setDeletingId] = React.useState(null);

  const filtered = React.useMemo(() => {
    const ql = q.trim().toLowerCase();
    let arr = services.filter(s => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (sourceFilter && s.source !== sourceFilter) return false;
      if (porterFilter) {
        if (porterFilter === '__none__' && s.assigned_porter_id) return false;
        if (porterFilter !== '__none__' && s.assigned_porter_id !== porterFilter) return false;
      }
      if (!ql) return true;
      const p = porterById.get(s.assigned_porter_id);
      const hay = [
        s.flight, s.client_name, s.agency, s.client_email, s.client_phone,
        p?.first_name, p?.last_name,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(ql);
    });
    arr.sort((a, b) => {
      const va = sortKey === 'total' ? totalChf(a) : a[sortKey];
      const vb = sortKey === 'total' ? totalChf(b) : b[sortKey];
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = va > vb ? 1 : va < vb ? -1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [services, q, statusFilter, sourceFilter, porterFilter, sortKey, sortDir, porterById]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [q, statusFilter, sourceFilter, porterFilter]);

  const onSort = (key) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const onSave = async (data) => {
    if (editing) await update(editing.id, data);
    else await insert(data);
  };

  const exportCsv = () => {
    const rows = filtered.map(s => {
      const p = porterById.get(s.assigned_porter_id);
      return {
        Date: formatDate(s.scheduled_at),
        Heure: formatTime(s.scheduled_at),
        Vol: s.flight,
        Client: s.client_name,
        Email: s.client_email ?? '',
        Telephone: s.client_phone,
        Porteur: p ? `${p.first_name} ${p.last_name}` : '',
        Agence: s.agency,
        Source: SOURCE_LABEL[s.source] ?? s.source,
        Bagages: s.bags,
        CHF: totalChf(s),
        Statut: STATUS_LABEL[s.status],
      };
    });
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `services-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Services"
        subtitle={isLoading ? 'Chargement…' : `${filtered.length} service${filtered.length > 1 ? 's' : ''} affiché${filtered.length > 1 ? 's' : ''}`}>
        <button onClick={exportCsv} className="btn-secondary"><Download size={16}/> Export CSV</button>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary">
          <Plus size={16}/> Ajouter service
        </button>
      </PageHeader>

      <div className="px-8 py-6 space-y-4">
        <div className="card p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Recherche client, vol, porteur, agence…"
                className="input pl-9"
              />
            </div>
            <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map(v => <option key={v} value={v}>{v ? STATUS_LABEL[v] : 'Tous statuts'}</option>)}
            </select>
            <select className="input w-auto" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              {SOURCE_OPTIONS.map(v => <option key={v} value={v}>{v ? SOURCE_LABEL[v] : 'Toutes sources'}</option>)}
            </select>
            <select className="input w-auto" value={porterFilter} onChange={(e) => setPorterFilter(e.target.value)}>
              <option value="">Tous porteurs</option>
              <option value="__none__">Non assigné</option>
              {porters.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 table-head">
                <tr>
                  <SortableTh sortKey="scheduled_at" current={sortKey} dir={sortDir} onClick={onSort}>Date</SortableTh>
                  <th>Heure</th>
                  <SortableTh sortKey="flight" current={sortKey} dir={sortDir} onClick={onSort}>Vol</SortableTh>
                  <SortableTh sortKey="client_name" current={sortKey} dir={sortDir} onClick={onSort}>Client</SortableTh>
                  <th>Porteur</th>
                  <SortableTh sortKey="agency" current={sortKey} dir={sortDir} onClick={onSort}>Agence</SortableTh>
                  <th className="text-right">Bag.</th>
                  <SortableTh sortKey="total" current={sortKey} dir={sortDir} onClick={onSort} className="text-right">CHF</SortableTh>
                  <SortableTh sortKey="status" current={sortKey} dir={sortDir} onClick={onSort}>Statut</SortableTh>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {pageRows.length === 0 && !isLoading && (
                  <tr><td colSpan={10} className="text-center text-muted py-12">
                    Aucun service ne correspond aux filtres.
                  </td></tr>
                )}
                {pageRows.map(s => {
                  const p = porterById.get(s.assigned_porter_id);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="text-xs text-muted">{formatDate(s.scheduled_at)}</td>
                      <td className="font-mono text-xs">{formatTime(s.scheduled_at)}</td>
                      <td className="font-display font-semibold">{s.flight}</td>
                      <td className="truncate max-w-[180px]">{s.client_name}</td>
                      <td>
                        {p ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="h-6 w-6 rounded-full bg-magenta/10 text-magenta flex items-center justify-center text-[10px] font-bold">
                              {p.initials || (p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')}
                            </span>
                            <span className="text-xs">{shortName(p)}</span>
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-red-600">Non assigné</span>
                        )}
                      </td>
                      <td className="text-xs text-muted">{s.agency}</td>
                      <td className="text-right tabular-nums">{s.bags}</td>
                      <td className="text-right tabular-nums font-semibold">{formatCHF(totalChf(s))}</td>
                      <td>
                        <span className={`badge ${STATUS_STYLES[s.status]}`}>
                          {STATUS_LABEL[s.status]}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn-ghost !h-8 !px-2" onClick={() => { setEditing(s); setModalOpen(true); }}>
                            <Pencil size={14}/>
                          </button>
                          <button className="btn-ghost !h-8 !px-2 text-red-500 hover:!text-red-600 hover:!bg-red-50" onClick={() => setDeletingId(s.id)}>
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-muted">
            <div>Page {page} / {pageCount} · {filtered.length} résultats</div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Précédent</button>
              <button className="btn-ghost" disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>Suivant →</button>
            </div>
          </div>
        </div>
      </div>

      <ServiceModal
        open={modalOpen}
        initial={editing}
        porters={porters}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={onSave}
      />

      {deletingId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/30 backdrop-blur-sm" onClick={() => setDeletingId(null)}>
          <div className="bg-white rounded-2xl shadow-cardHover w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold tracking-tight">Supprimer ce service ?</h3>
            <p className="mt-2 text-sm text-muted">Cette action est irréversible.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setDeletingId(null)}>Annuler</button>
              <button className="btn-danger" onClick={async () => { await remove(deletingId); setDeletingId(null); }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SortableTh({ sortKey, current, dir, onClick, children, className = '' }) {
  const active = current === sortKey;
  return (
    <th className={className}>
      <button
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-ink ${active ? 'text-ink' : ''}`}>
        {children}
        <ArrowUpDown size={11} className={active ? '' : 'opacity-40'}/>
        {active ? <span className="text-[9px]">{dir === 'asc' ? '↑' : '↓'}</span> : null}
      </button>
    </th>
  );
}
