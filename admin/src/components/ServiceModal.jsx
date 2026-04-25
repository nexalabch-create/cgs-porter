import React from 'react';
import { X } from 'lucide-react';

const FLOW_OPTIONS = [
  { v: 'arrivee', label: 'Arrivée' },
  { v: 'depart',  label: 'Départ' },
];
const SOURCE_OPTIONS = [
  { v: 'web',       label: 'Web' },
  { v: 'dnata',     label: 'DNATA' },
  { v: 'swissport', label: 'Swissport' },
  { v: 'prive',     label: 'Privé' },
];

const empty = {
  flight: '', scheduled_at: '', client_name: '', client_email: '', client_phone: '',
  meeting_point: '', bags: 1, base_price_chf: 25, per_bag_price_chf: 12,
  agency: '', flow: 'arrivee', source: 'web', remarques: '',
  assigned_porter_id: '', status: 'todo',
};

// scheduled_at <-> <input type="datetime-local"> conversion (no TZ in <input>).
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ServiceModal({ open, initial, porters, onClose, onSave }) {
  const [form, setForm] = React.useState(empty);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
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
      base_price_chf: Number(form.base_price_chf) || 0,
      per_bag_price_chf: Number(form.per_bag_price_chf) || 0,
      assigned_porter_id: form.assigned_porter_id || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    };
    await onSave(payload);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/30 backdrop-blur-sm"
         onClick={onClose}>
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

        <div className="px-6 py-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date & heure RDV">
              <input type="datetime-local" required className="input"
                     value={form.scheduled_at} onChange={set('scheduled_at')} />
            </Field>
            <Field label="Vol">
              <input required className="input" placeholder="EK455"
                     value={form.flight} onChange={set('flight')} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Direction">
              <select className="input" value={form.flow} onChange={set('flow')}>
                {FLOW_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Source">
              <select className="input" value={form.source} onChange={set('source')}>
                {SOURCE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select className="input" value={form.status} onChange={set('status')}>
                <option value="todo">À faire</option>
                <option value="active">En cours</option>
                <option value="done">Terminé</option>
              </select>
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
            <input required className="input" value={form.meeting_point} onChange={set('meeting_point')} />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Bagages">
              <input type="number" min={0} className="input" value={form.bags} onChange={set('bags')} />
            </Field>
            <Field label="Prix base CHF">
              <input type="number" step="0.5" className="input" value={form.base_price_chf} onChange={set('base_price_chf')} />
            </Field>
            <Field label="Prix / bagage CHF">
              <input type="number" step="0.5" className="input" value={form.per_bag_price_chf} onChange={set('per_bag_price_chf')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Agence">
              <input className="input" value={form.agency} onChange={set('agency')} />
            </Field>
            <Field label="Assigné à">
              <select className="input" value={form.assigned_porter_id ?? ''} onChange={set('assigned_porter_id')}>
                <option value="">Non assigné</option>
                {porters.filter(p => p.role === 'porter' || p.role === 'chef').map(p => (
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

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Enregistrement…' : (initial ? 'Enregistrer' : 'Créer')}
          </button>
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
