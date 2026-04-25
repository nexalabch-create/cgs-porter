import React from 'react';
import Papa from 'papaparse';
import {
  Calendar, Plus, Pencil, Trash2, Upload, Search, X,
  Check, AlertCircle, Sparkles, ChevronLeft, ChevronRight,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { useShifts } from '../hooks/useShifts.js';

// Quick-pick chips relative to today.
function dateChips() {
  const today = new Date();
  const make = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    const pad = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  return [
    { label: "Aujourd'hui", value: make(0) },
    { label: 'Demain',      value: make(1) },
    { label: 'Après-demain',value: make(2) },
    { label: '+1 semaine',  value: make(7) },
  ];
}

const SHIFT_PRESETS = [
  { code: 'CQ1', start: '06:00', end: '14:30', pause: 30 },
  { code: 'CQ2', start: '14:15', end: '23:30', pause: 45 },
  { code: 'TR1', start: '05:15', end: '14:30', pause: 45 },
  { code: 'TR5', start: '12:00', end: '21:00', pause: 45 },
  { code: 'TR6', start: '06:00', end: '15:00', pause: 45 },
  { code: 'CA1', start: '10:00', end: '19:00', pause: 45 },
  { code: 'CO2', start: '14:15', end: '23:30', pause: 45 },
];

export default function Planning() {
  const chips = React.useMemo(dateChips, []);
  const [date, setDate] = React.useState(chips[0].value);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [csvOpen, setCsvOpen] = React.useState(false);

  const { shifts, employees, isLoading, upsertShift, insertMany, deleteShift } = useShifts(date);

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('fr-CH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      <PageHeader
        title="Planning"
        subtitle={isLoading ? 'Chargement…' : `${shifts.length} employé${shifts.length > 1 ? 's' : ''} planifié${shifts.length > 1 ? 's' : ''} · ${dateLabel}`}>
        <button onClick={() => setCsvOpen(true)} className="btn-secondary">
          <Upload size={16}/> Importer CSV roster
        </button>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary">
          <Plus size={16}/> Ajouter un employé
        </button>
      </PageHeader>

      <div className="px-8 py-6 space-y-4">
        {/* Date chips + picker */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {chips.map(c => (
              <button
                key={c.value}
                onClick={() => setDate(c.value)}
                className={`h-9 px-4 rounded-lg text-sm font-semibold transition ${
                  date === c.value
                    ? 'bg-magenta text-white shadow-[0_8px_18px_-8px_rgba(233,30,140,.55)]'
                    : 'bg-white border border-slate-200 text-ink hover:bg-slate-50'
                }`}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex-1"/>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(date + 'T12:00'); d.setDate(d.getDate() - 1);
                setDate(d.toISOString().slice(0, 10));
              }}
              className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-muted">
              <ChevronLeft size={16}/>
            </button>
            <input
              type="date" value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm font-mono"
            />
            <button
              onClick={() => {
                const d = new Date(date + 'T12:00'); d.setDate(d.getDate() + 1);
                setDate(d.toISOString().slice(0, 10));
              }}
              className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-muted">
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>

        {/* Shifts table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 table-head">
              <tr>
                <th>Employé</th>
                <th>ID CGS</th>
                <th>Code</th>
                <th>Début</th>
                <th>Fin</th>
                <th className="text-right">Pause</th>
                <th>Heures travaillées</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {!isLoading && shifts.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-12">
                    Personne planifié pour ce jour.
                    <div className="mt-3">
                      <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary">
                        <Plus size={16}/> Ajouter le premier
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {shifts.map(s => {
                const u = s.user;
                const startMin = toMin(s.starts_at);
                const endMin = toMin(s.ends_at);
                const workedMin = (endMin - startMin) - (s.pause_minutes || 0);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-magenta/10 text-magenta flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {u?.initials || '??'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {u ? `${u.first_name} ${u.last_name}` : '— inconnu —'}
                          </div>
                          {u?.role === 'chef' && (
                            <span className="badge bg-navy text-white !text-[9px] !px-1.5 !py-0.5">Chef</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-muted font-mono">{u?.cgs_employee_id ?? '—'}</td>
                    <td><span className="badge bg-slate-100 text-ink">{s.code}</span></td>
                    <td className="font-mono text-sm">{s.starts_at?.slice(0, 5)}</td>
                    <td className="font-mono text-sm">{s.ends_at?.slice(0, 5)}</td>
                    <td className="text-right text-sm tabular-nums">{s.pause_minutes} min</td>
                    <td className="text-sm tabular-nums">{(workedMin / 60).toFixed(1)} h</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(s); setModalOpen(true); }} className="btn-ghost !h-8 !px-2">
                          <Pencil size={14}/>
                        </button>
                        <button onClick={async () => {
                          if (confirm(`Retirer ${u?.first_name} ${u?.last_name} du planning du ${dateLabel} ?`)) {
                            await deleteShift(s.id);
                          }
                        }} className="btn-ghost !h-8 !px-2 text-red-500 hover:!text-red-600 hover:!bg-red-50">
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

        {/* Quick stats */}
        {shifts.length > 0 && (
          <div className="card p-4 flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="label">Total heures</span>
              <div className="font-display text-xl font-semibold tabular-nums mt-0.5">
                {shifts.reduce((acc, s) => {
                  const w = toMin(s.ends_at) - toMin(s.starts_at) - (s.pause_minutes || 0);
                  return acc + Math.max(0, w);
                }, 0) / 60} h
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200"/>
            <div>
              <span className="label">Codes</span>
              <div className="font-display text-xl font-semibold tabular-nums mt-0.5">
                {[...new Set(shifts.map(s => s.code))].join(' · ')}
              </div>
            </div>
          </div>
        )}
      </div>

      <ShiftModal
        open={modalOpen}
        date={date}
        editing={editing}
        employees={employees}
        existingUserIds={shifts.map(s => s.user_id)}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={async (data) => {
          await upsertShift(data);
          setModalOpen(false);
          setEditing(null);
        }}
      />

      <ImportRosterModal
        open={csvOpen}
        date={date}
        employees={employees}
        onClose={() => setCsvOpen(false)}
        onImport={insertMany}
      />
    </>
  );
}

function toMin(hms) {
  if (!hms) return 0;
  const [h, m] = hms.split(':').map(Number);
  return h * 60 + (m || 0);
}

// ─── Add/Edit modal ───────────────────────────────────────────────────
function ShiftModal({ open, date, editing, employees, existingUserIds, onClose, onSave }) {
  const [form, setForm] = React.useState({
    user_id: '', code: 'CO2', starts_at: '14:15', ends_at: '23:30', pause_minutes: 45,
  });

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        user_id: editing.user_id,
        code: editing.code,
        starts_at: editing.starts_at?.slice(0, 5) || '',
        ends_at: editing.ends_at?.slice(0, 5) || '',
        pause_minutes: editing.pause_minutes,
      });
    } else {
      setForm({ user_id: '', code: 'CO2', starts_at: '14:15', ends_at: '23:30', pause_minutes: 45 });
    }
  }, [open, editing]);

  if (!open) return null;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // When user picks a preset, fill the times.
  const applyPreset = (p) => setForm(f => ({
    ...f,
    code: p.code, starts_at: p.start, ends_at: p.end, pause_minutes: p.pause,
  }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.user_id) return;
    await onSave({
      user_id: form.user_id,
      shift_date: date,
      code: form.code.toUpperCase(),
      starts_at: form.starts_at + ':00',
      ends_at: form.ends_at + ':00',
      pause_minutes: Number(form.pause_minutes) || 0,
    });
  };

  // Hide already-scheduled employees from the picker (except in edit mode).
  const available = editing
    ? employees
    : employees.filter(u => !existingUserIds.includes(u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-cardHover w-full max-w-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {editing ? 'Modifier le shift' : 'Ajouter un employé au planning'}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            <X size={20}/>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label className="block">
            <span className="label">Employé</span>
            <select
              required
              disabled={!!editing}
              className="input mt-1.5"
              value={form.user_id}
              onChange={set('user_id')}>
              <option value="">— Sélectionner —</option>
              {available.map(u => (
                <option key={u.id} value={u.id}>
                  {u.last_name}, {u.first_name} {u.cgs_employee_id ? `(${u.cgs_employee_id})` : ''}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="label">Presets de shift</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SHIFT_PRESETS.map(p => (
                <button key={p.code} type="button" onClick={() => applyPreset(p)}
                        className="h-8 px-3 rounded-md border border-slate-200 bg-white hover:bg-magenta-50 hover:border-magenta text-xs font-semibold">
                  {p.code} · {p.start}-{p.end}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <label className="block">
              <span className="label">Code</span>
              <input className="input mt-1.5 uppercase" value={form.code} onChange={set('code')} placeholder="CQ2" required/>
            </label>
            <label className="block">
              <span className="label">Début</span>
              <input type="time" className="input mt-1.5" value={form.starts_at} onChange={set('starts_at')} required/>
            </label>
            <label className="block">
              <span className="label">Fin</span>
              <input type="time" className="input mt-1.5" value={form.ends_at} onChange={set('ends_at')} required/>
            </label>
            <label className="block">
              <span className="label">Pause (min)</span>
              <input type="number" min="0" className="input mt-1.5" value={form.pause_minutes} onChange={set('pause_minutes')} required/>
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="submit" className="btn-primary">
            {editing ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Roster CSV import modal ─────────────────────────────────────────
function ImportRosterModal({ open, date, employees, onClose, onImport }) {
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const dropRef = React.useRef(null);
  const [dragOver, setDragOver] = React.useState(false);

  React.useEffect(() => { if (!open) { setFile(null); setPreview(null); setError(null); } }, [open]);

  if (!open) return null;

  const byCgsId = new Map(employees.filter(e => e.cgs_employee_id).map(e => [e.cgs_employee_id, e]));

  const handleFile = (f) => {
    if (!f) return;
    setFile(f); setError(null); setPreview(null);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length) { setError(errors[0].message); return; }
        const rows = data.map(r => {
          const u = byCgsId.get(String(r.cgs_employee_id || '').trim()) ||
                    employees.find(e => e.last_name?.toLowerCase() === String(r.last_name || '').toLowerCase());
          return {
            cgs_employee_id: r.cgs_employee_id,
            last_name: r.last_name,
            first_name: r.first_name,
            code: String(r.code || '').trim().toUpperCase(),
            begin: String(r.begin || '').trim(),
            end:   String(r.end || '').trim(),
            pause: Number(r.break_minutes || r.pause_minutes || 30),
            comment: r.comment,
            matchedUser: u || null,
          };
        });
        setPreview(rows);
      },
    });
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const loadDemo = async () => {
    const r = await fetch('/templates/roster-2026-03-01.csv');
    const csv = await r.text();
    handleFile(new File([new Blob([csv], { type: 'text/csv' })], 'demo-roster.csv'));
  };

  const importAll = async () => {
    setImporting(true);
    const matched = preview.filter(r => r.matchedUser);
    const rows = matched.map(r => ({
      user_id: r.matchedUser.id,
      shift_date: date,
      code: r.code,
      starts_at: r.begin.length === 5 ? r.begin + ':00' : r.begin,
      ends_at:   r.end.length === 5   ? r.end + ':00'   : r.end,
      pause_minutes: r.pause,
    }));
    const res = await onImport(rows);
    setImporting(false);
    if (res.error) { setError(typeof res.error === 'string' ? res.error : res.error.message); return; }
    onClose();
  };

  const matchedCount = preview?.filter(r => r.matchedUser).length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="bg-white rounded-2xl shadow-cardHover w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Importer roster CSV
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Pour le <strong>{new Date(date + 'T12:00').toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20}/></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {!preview && (
            <>
              <button onClick={loadDemo} className="btn-secondary w-full">
                <Sparkles size={16}/> Charger jeu démo (roster 01/03/2026)
              </button>
              <div className="text-xs text-muted text-center">— ou —</div>
              <div
                ref={dropRef}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => dropRef.current?.querySelector('input')?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed transition px-6 py-10 text-center ${
                  dragOver ? 'border-magenta bg-magenta-50' : 'border-slate-300 bg-slate-50 hover:border-magenta'
                }`}>
                <input type="file" accept=".csv" hidden onChange={(e) => handleFile(e.target.files[0])}/>
                <Upload size={22} className="mx-auto text-magenta mb-2"/>
                <div className="font-semibold">{file ? file.name : 'Glisse ton CSV ici'}</div>
                <div className="text-xs text-muted mt-1">
                  Colonnes attendues: <code>cgs_employee_id, last_name, first_name, code, begin, end, break_minutes</code>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={16}/> {error}
            </div>
          )}

          {preview && (
            <>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <strong>{preview.length}</strong> lignes · <strong className="text-emerald-700">{matchedCount} matched</strong>
                  {' '}· <strong className="text-red-600">{preview.length - matchedCount} unmatched</strong>
                </div>
                <button onClick={() => { setFile(null); setPreview(null); }} className="btn-ghost">
                  Recommencer
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 table-head">
                    <tr><th>ID</th><th>Nom</th><th>Code</th><th>Début</th><th>Fin</th><th>Pause</th><th>Match</th></tr>
                  </thead>
                  <tbody className="table-body">
                    {preview.map((r, i) => (
                      <tr key={i} className={r.matchedUser ? '' : 'bg-red-50'}>
                        <td className="font-mono text-xs">{r.cgs_employee_id}</td>
                        <td className="text-xs">{r.last_name}, {r.first_name}</td>
                        <td><span className="badge bg-slate-100 text-ink">{r.code}</span></td>
                        <td className="font-mono text-xs">{r.begin}</td>
                        <td className="font-mono text-xs">{r.end}</td>
                        <td className="text-xs">{r.pause} min</td>
                        <td>
                          {r.matchedUser ? (
                            <span className="badge bg-emerald-50 text-emerald-700"><Check size={10}/> {r.matchedUser.first_name}</span>
                          ) : (
                            <span className="badge bg-red-50 text-red-700"><X size={10}/> introuvable</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {preview && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">Annuler</button>
            <button onClick={importAll} disabled={importing || matchedCount === 0} className="btn-primary">
              {importing ? 'Import…' : <><Sparkles size={16}/> Importer {matchedCount} shifts</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
