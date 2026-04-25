import React from 'react';
import { X, UserCheck, User } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const empty = {
  first_name: '', last_name: '', cgs_employee_id: '', role: 'porter',
};

export default function EmployeeModal({ open, employee, onClose, onSaved }) {
  const [form, setForm] = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (employee) {
      setForm({
        first_name: employee.first_name || '',
        last_name:  employee.last_name  || '',
        cgs_employee_id: employee.cgs_employee_id || '',
        role: employee.role || 'porter',
      });
    } else {
      setForm(empty);
    }
  }, [open, employee]);

  if (!open) return null;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Mode démo — Supabase non configuré.");
      return;
    }
    setSaving(true); setError(null);
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      cgs_employee_id: form.cgs_employee_id?.trim() || null,
      role: form.role,
    };
    const { error: e2 } = await supabase
      .from('users').update(payload).eq('id', employee.id);
    setSaving(false);
    if (e2) { setError(e2.message); return; }
    onSaved && onSaved({ ...employee, ...payload });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-cardHover w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Modifier l'employé
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink"><X size={20}/></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="h-12 w-12 rounded-full bg-magenta/10 text-magenta flex items-center justify-center font-display font-bold">
              {((form.first_name?.[0] || '') + (form.last_name?.[0] || '')).toUpperCase() || '??'}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted truncate">{employee?.email}</div>
              <div className="text-[11px] text-muted/70">L'email se modifie via Supabase Auth</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Prénom</span>
              <input className="input mt-1.5" required value={form.first_name} onChange={set('first_name')}/>
            </label>
            <label className="block">
              <span className="label">Nom</span>
              <input className="input mt-1.5" required value={form.last_name} onChange={set('last_name')}/>
            </label>
          </div>

          <label className="block">
            <span className="label">ID CGS (matricule)</span>
            <input className="input mt-1.5 font-mono" placeholder="10865" value={form.cgs_employee_id} onChange={set('cgs_employee_id')}/>
          </label>

          <div>
            <span className="label">Rôle</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {[
                { v: 'porter', label: 'Porteur',         icon: User },
                { v: 'chef',   label: "Chef d'équipe",   icon: UserCheck },
              ].map(r => {
                const a = form.role === r.v;
                const Ico = r.icon;
                return (
                  <button key={r.v} type="button"
                          onClick={() => setForm(f => ({ ...f, role: r.v }))}
                          className={`h-12 px-3 rounded-lg border-2 transition flex items-center justify-center gap-2 text-sm font-semibold ${
                            a
                              ? (r.v === 'chef' ? 'border-navy bg-navy text-white' : 'border-magenta bg-magenta-50 text-magenta-700')
                              : 'border-slate-200 bg-white text-muted hover:border-slate-300'
                          }`}>
                    <Ico size={16}/> {r.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted leading-relaxed">
              Un chef d'équipe accède au panel admin et peut assigner les services. Un porteur ne voit que ses propres services dans l'app mobile.
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
