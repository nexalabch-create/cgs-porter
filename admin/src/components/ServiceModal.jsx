import React from 'react';
import { X, Plane, ArrowRight, ArrowLeft } from 'lucide-react';
import { totalChfFor, priceBreakdown } from '../lib/pricing.js';

// Three primary categories the chef thinks in. Web + GUICHET are edge cases
// hidden under "Autres".
const PRIMARY_SOURCES = [
  { v: 'prive',     label: 'Privé',     hint: '25 CHF + 5 CHF/bag.' },
  { v: 'dnata',     label: 'DNATA',     hint: '15 CHF + 4 CHF/bag.' },
  { v: 'swissport', label: 'Swissport', hint: '15 CHF + 4 CHF/bag.' },
];
const ADVANCED_SOURCES = [
  { v: 'web',     label: 'Web' },
  { v: 'guichet', label: 'Guichet' },
];

const FLOW_OPTIONS = [
  { v: 'arrivee', label: 'Arrivée', icon: ArrowLeft },
  { v: 'depart',  label: 'Départ',  icon: ArrowRight },
];

const empty = {
  flight: '', scheduled_at: '', client_name: '', client_email: '', client_phone: '',
  meeting_point: '', bags: 1,
  agency: '', flow: 'arrivee', source: 'dnata', remarques: '',
  assigned_porter_id: '', status: 'todo',
};

const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ServiceModal({ open, initial, porters, onClose, onSave }) {
  const [form, setForm] = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setShowAdvanced(false);
    setForm(initial
      ? { ...empty, ...initial, scheduled_at: toLocalInput(initial.scheduled_at) }
      : { ...empty, scheduled_at: toLocalInput(new Date().toISOString()) });
  }, [open, initial]);

  if (!open) return null;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      bags: Number(form.bags) || 1,
      // Legacy columns kept in sync with the chosen source so existing rows
      // still read sensibly even if they're queried directly.
      base_price_chf: form.source === 'prive' || form.source === 'web' || form.source === 'guichet' ? 25 : 15,
      per_bag_price_chf: form.source === 'prive' || form.source === 'web' || form.source === 'guichet' ? 5 : 4,
      assigned_porter_id: form.assigned_porter_id || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    };
    await onSave(payload);
    setSaving(false);
    onClose();
  };

  const total = totalChfFor({ source: form.source, bags: Number(form.bags) || 0 });
  const breakdown = priceBreakdown({ source: form.source, bags: Number(form.bags) || 0 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-cardHover w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {initial ? 'Modifier le service' : 'Nouveau service'}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {/* Source segmented control — top of the form */}
          <div>
            <span className="label">Source</span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {PRIMARY_SOURCES.map(s => {
                const a = form.source === s.v;
                return (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, source: s.v }))}
                    className={`h-12 px-3 rounded-lg border-2 transition flex flex-col items-center justify-center gap-0.5 ${
                      a
                        ? 'border-magenta bg-magenta-50 text-magenta-700'
                        : 'border-slate-200 bg-white text-ink hover:border-magenta-200 hover:bg-magenta-50/40'
                    }`}>
                    <span className="font-semibold text-sm">{s.label}</span>
                    <span className="text-[10px] font-medium text-muted">{s.hint}</span>
                  </button>
                );
              })}
            </div>
            {!showAdvanced ? (
              <button
                type="button"
                onClick={() => setShowAdvanced(true)}
                className="mt-2 text-xs text-muted hover:text-ink">
                + Autres sources (Web, Guichet)
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                {ADVANCED_SOURCES.map(s => {
                  const a = form.source === s.v;
                  return (
                    <button
                      key={s.v} type="button"
                      onClick={() => setForm(f => ({ ...f, source: s.v }))}
                      className={`h-9 px-3 rounded-md text-xs font-semibold transition ${
                        a ? 'bg-navy text-white' : 'bg-slate-100 text-muted hover:bg-slate-200'
                      }`}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Direction segmented */}
          <div>
            <span className="label">Direction</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2 max-w-xs">
              {FLOW_OPTIONS.map(o => {
                const a = form.flow === o.v;
                const Ico = o.icon;
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, flow: o.v }))}
                    className={`h-10 px-3 rounded-lg border-2 transition flex items-center justify-center gap-2 text-sm font-semibold ${
                      a
                        ? (o.v === 'arrivee' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-amber-500 bg-amber-50 text-amber-700')
                        : 'border-slate-200 bg-white text-muted hover:border-slate-300'
                    }`}>
                    <Ico size={16}/> {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date & heure RDV">
              <input type="datetime-local" required className="input"
                     value={form.scheduled_at} onChange={set('scheduled_at')} />
            </Field>
            <Field label="Vol">
              <input required className="input uppercase" placeholder="EK455"
                     value={form.flight} onChange={set('flight')} />
            </Field>
          </div>

          <Field label="Nom du client">
            <input required className="input" value={form.client_name} onChange={set('client_name')} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email"><input type="email" className="input" value={form.client_email ?? ''} onChange={set('client_email')} /></Field>
            <Field label="Téléphone"><input className="input" value={form.client_phone} onChange={set('client_phone')} /></Field>
          </div>

          <Field label="Point de rendez-vous">
            <input required className="input" placeholder="Terminal 1 · Porte A12" value={form.meeting_point} onChange={set('meeting_point')} />
          </Field>

          {/* Bags + auto price preview */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="label">Bagages</div>
                <div className="text-[11px] text-muted mt-0.5">
                  Inclus dans le forfait : 3 bagages · facturation par tranche au-delà
                </div>
              </div>
              <input type="number" min={0} max={20} className="input !h-11 w-20 text-center text-lg font-display font-semibold"
                     value={form.bags} onChange={set('bags')} />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="text-xs text-muted">{breakdown}</div>
              <div className="font-display text-2xl font-semibold text-magenta tabular-nums">
                {total} CHF
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Statut">
              <select className="input" value={form.status} onChange={set('status')}>
                <option value="todo">À faire</option>
                <option value="active">En cours</option>
                <option value="done">Terminé</option>
              </select>
            </Field>
            <Field label="Assigné à">
              <select className="input" value={form.assigned_porter_id ?? ''} onChange={set('assigned_porter_id')}>
                <option value="">Non assigné</option>
                {porters.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Remarques">
            <textarea rows={3} className="input !h-auto py-2"
                      value={form.remarques ?? ''} onChange={set('remarques')} />
          </Field>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <div className="text-xs text-muted">
            <span className="font-semibold">Total facturé :</span> {total} CHF
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement…' : (initial ? 'Enregistrer' : 'Créer')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
