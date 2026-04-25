import React from 'react';
import { Save, Copy, Check } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { demo } from '../lib/demoData.js';

export default function Parametres() {
  const [settings, setSettings] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured) {
        setSettings(demo.settings);
        return;
      }
      const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single();
      setSettings(data ?? demo.settings);
    })();
  }, []);

  if (!settings) return <PageHeader title="Paramètres" subtitle="Chargement…"/>;

  const set = (k) => (e) => setSettings(s => ({ ...s, [k]: e.target.value }));
  const setNum = (k) => (e) => setSettings(s => ({ ...s, [k]: Number(e.target.value) || 0 }));

  const save = async () => {
    setSaving(true);
    if (isSupabaseConfigured) {
      await supabase.from('app_settings').update(settings).eq('id', 1);
    }
    setSaving(false);
    setSavedAt(new Date());
    setTimeout(() => setSavedAt(null), 2000);
  };

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Configuration de l'entreprise et tarifs.">
        <button onClick={save} disabled={saving} className="btn-primary">
          {savedAt ? <><Check size={16}/> Enregistré</> : <><Save size={16}/> Enregistrer</>}
        </button>
      </PageHeader>

      <div className="px-8 py-6 space-y-6 max-w-4xl">
        <Section title="Informations entreprise">
          <Row>
            <Field label="Nom"><input className="input" value={settings.company_name} onChange={set('company_name')}/></Field>
            <Field label="E-mail"><input type="email" className="input" value={settings.company_email} onChange={set('company_email')}/></Field>
          </Row>
          <Row>
            <Field label="Adresse"><input className="input" value={settings.company_address} onChange={set('company_address')}/></Field>
            <Field label="Téléphone"><input className="input" value={settings.company_phone} onChange={set('company_phone')}/></Field>
          </Row>
        </Section>

        <Section title="Tarification" hint="Le prix total facturé = base + (bagages au-delà du forfait × prix par bagage supplémentaire).">
          <Row>
            <Field label="Prix de base CHF">
              <input type="number" step="0.5" className="input" value={settings.base_price_chf} onChange={setNum('base_price_chf')}/>
            </Field>
            <Field label="Bagages inclus dans le forfait">
              <input type="number" min={0} className="input" value={settings.bags_included_in_base} onChange={setNum('bags_included_in_base')}/>
            </Field>
            <Field label="Prix / bagage supplémentaire CHF">
              <input type="number" step="0.5" className="input" value={settings.per_extra_bag_price_chf} onChange={setNum('per_extra_bag_price_chf')}/>
            </Field>
          </Row>
        </Section>

        <Section title="Webhook Google Apps Script" hint="URL utilisée par le formulaire web pour pousser des nouvelles réservations vers Supabase.">
          <div className="flex items-center gap-2">
            <input className="input flex-1 font-mono text-xs"
                   value={settings.webhook_apps_script_url ?? ''}
                   onChange={set('webhook_apps_script_url')}/>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                navigator.clipboard.writeText(settings.webhook_apps_script_url ?? '');
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}>
              {copied ? <Check size={16}/> : <Copy size={16}/>}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
        </Section>

        <Section title="Application">
          <Row>
            <Field label="Version">
              <input className="input" value={settings.app_version} disabled/>
            </Field>
            <Field label="Mode">
              <input className="input" value={isSupabaseConfigured ? 'Production (Supabase)' : 'Démo (mémoire)'} disabled/>
            </Field>
          </Row>
        </Section>
      </div>
    </>
  );
}

function Section({ title, hint, children }) {
  return (
    <div className="card p-6">
      <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      {hint ? <p className="mt-1 text-xs text-muted leading-relaxed">{hint}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function Row({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
