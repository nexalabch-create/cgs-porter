import React from 'react';
import Papa from 'papaparse';
import { Upload, FileText, Check, X, AlertCircle, Download, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

// Default to *today* so the imported services show up immediately in
// "Services aujourd'hui" / "CA aujourd'hui" on the dashboard.
const todayIso = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const TODAY_DEFAULT = todayIso();

// Map a CSV row from the daily-services sheet onto a public.services insert.
function rowToService(row, dateStr) {
  // Combine date + RDV (HH:MM) into a timestamptz.
  const rdv = (row.rdv || '').replace(/\./g, ':').slice(0, 5);
  const scheduled = `${dateStr}T${rdv}:00+02:00`;
  const direction = (row.direction || '').toLowerCase().startsWith('out') ? 'depart' : 'arrivee';
  const source = (row.source || '').toLowerCase().trim();
  const validSource = ['web', 'dnata', 'swissport', 'prive', 'guichet'].includes(source) ? source : 'dnata';
  return {
    service_num: row.service_num ? Number(row.service_num) : null,
    flight: row.flight_number || row.flight || '',
    scheduled_at: scheduled,
    client_name: row.client_name || row.client || '—',
    meeting_point: row.meeting_point || `Terminal ${direction === 'arrivee' ? '1' : '2'}`,
    bags: row.bags ? Number(row.bags) : 1,
    base_price_chf: 25,
    per_bag_price_chf: 12,
    status: 'todo',
    agency: source.toUpperCase(),
    client_phone: row.client_phone || row.phone || '',
    flow: direction,
    source: validSource,
    remarques: row.remarques || row.notes || '',
    assigned_porter_id: null,
  };
}

export default function Importer() {
  const [date, setDate] = React.useState(TODAY_DEFAULT);
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [parsing, setParsing] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [done, setDone] = React.useState(null);
  const [error, setError] = React.useState(null);

  const dropRef = React.useRef(null);
  const [dragOver, setDragOver] = React.useState(false);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setError(null);
    setDone(null);
    setPreview(null);
    setParsing(true);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        setParsing(false);
        if (errors.length) {
          setError(`Parse error: ${errors[0].message} (line ${errors[0].row})`);
          return;
        }
        if (data.length === 0) {
          setError('CSV vide ou en-têtes manquants.');
          return;
        }
        setPreview(data);
      },
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const importNow = async () => {
    if (!preview) return;
    if (!isSupabaseConfigured) {
      setError("Supabase n'est pas configuré — vérifie .env.local.");
      return;
    }
    setImporting(true);
    setError(null);

    const rows = preview.map(r => rowToService(r, date));
    const { data, error: e } = await supabase.from('services').insert(rows).select('id');
    setImporting(false);
    if (e) {
      setError(`Import échoué: ${e.message}`);
      return;
    }
    setDone({ count: data.length, date });
    setPreview(null);
    setFile(null);
  };

  const reset = () => {
    setFile(null); setPreview(null); setError(null); setDone(null);
  };

  // Quick-load the bundled demo CSV for board presentations.
  const loadDemo = async () => {
    setError(null); setDone(null);
    const res = await fetch('/templates/services-2026-03-01.csv');
    const csv = await res.text();
    const blob = new Blob([csv], { type: 'text/csv' });
    const f = new File([blob], 'demo-services.csv', { type: 'text/csv' });
    handleFile(f);
  };

  return (
    <>
      <PageHeader
        title="Importer"
        subtitle="Charge les services du jour ou le roster depuis un CSV / Google Sheets exporté.">
        <button onClick={loadDemo} className="btn-secondary">
          <Sparkles size={16}/> Charger jeu démo
        </button>
        <a href="/templates/services-2026-03-01.csv" download className="btn-secondary">
          <Download size={16}/> Modèle services
        </a>
        <a href="/templates/roster-2026-03-01.csv" download className="btn-secondary">
          <Download size={16}/> Modèle roster
        </a>
      </PageHeader>

      <div className="px-8 py-6 space-y-6 max-w-5xl">
        {/* Step 1 — date + drop zone */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">1 · Sélectionner le jour</h2>
          <div className="mt-4 max-w-xs">
            <span className="label">Date des services</span>
            <input type="date" className="input mt-1.5" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">2 · Charger le CSV</h2>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Colonnes attendues : <code className="bg-slate-100 px-1.5 py-0.5 rounded">service_num, source, rdv, flight_number, direction, client_name, bags, remarques</code>.
            <br/>Depuis Google Sheets : <strong>Fichier → Télécharger → Valeurs séparées par des virgules (.csv)</strong>.
          </p>

          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => dropRef.current?.querySelector('input')?.click()}
            className={`mt-5 cursor-pointer rounded-2xl border-2 border-dashed transition px-6 py-12 text-center ${
              dragOver ? 'border-magenta bg-magenta-50' : 'border-slate-300 bg-slate-50 hover:border-magenta hover:bg-magenta-50/50'
            }`}>
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-magenta/10 text-magenta mb-3">
              <Upload size={22}/>
            </div>
            <div className="font-semibold">
              {file ? file.name : 'Glisse ton CSV ici, ou clique pour choisir'}
            </div>
            <div className="text-xs text-muted mt-1">CSV uniquement · jusqu'à 1 MB</div>
          </div>

          {parsing && <div className="mt-4 text-sm text-muted">Analyse en cours…</div>}
          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={16}/> {error}
            </div>
          )}
        </div>

        {/* Step 3 — preview + import */}
        {preview && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  3 · Aperçu — {preview.length} services
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Vérifie avant d'envoyer. Tous les services seront créés en statut <code className="bg-slate-100 px-1 py-0.5 rounded">à faire</code> et sans travailleur assigné.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={reset} className="btn-secondary"><X size={16}/> Annuler</button>
                <button onClick={importNow} disabled={importing} className="btn-primary">
                  {importing ? 'Import…' : <><Sparkles size={16}/> Importer {preview.length} services</>}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 table-head">
                  <tr>
                    <th>#</th><th>Source</th><th>RDV</th><th>Vol</th><th>Dir.</th><th>Client</th><th>Bag.</th><th>Remarques</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {preview.map((r, i) => (
                    <tr key={i}>
                      <td className="font-mono text-xs">{r.service_num}</td>
                      <td>
                        <span className="badge bg-slate-100 text-muted uppercase">{r.source}</span>
                      </td>
                      <td className="font-mono text-xs">{r.rdv}</td>
                      <td className="font-display font-semibold">{r.flight_number}</td>
                      <td><span className={`badge ${r.direction === 'in' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{r.direction}</span></td>
                      <td className="text-xs">{r.client_name || '—'}</td>
                      <td className="text-right tabular-nums">{r.bags || ''}</td>
                      <td className="text-xs text-muted truncate max-w-[200px]">{r.remarques}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {done && (
          <div className="card p-6 bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check size={20}/>
              </div>
              <div>
                <div className="font-display text-lg font-semibold tracking-tight text-emerald-900">
                  ✓ {done.count} services importés pour le {done.date}
                </div>
                <p className="text-sm text-emerald-700 mt-0.5">
                  Va sur <a href="/services" className="underline font-semibold">Services</a> pour les voir, ou directement sur le <a href="/" className="underline font-semibold">Dashboard</a>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* How-to */}
        <div className="card p-6 bg-slate-50">
          <h3 className="font-display text-base font-semibold tracking-tight flex items-center gap-2">
            <FileText size={18}/> Workflow recommandé
          </h3>
          <ol className="mt-3 space-y-2 text-sm text-muted leading-relaxed list-decimal list-inside">
            <li>Le matin, télécharge le PDF/Excel envoyé par DNATA / Swissport.</li>
            <li>Ouvre-le dans Google Sheets, complète/vérifie les colonnes attendues, exporte en <strong>CSV</strong>.</li>
            <li>Glisse le CSV ici, vérifie l'aperçu, clique <strong>Importer</strong>.</li>
            <li>Les services apparaissent immédiatement sur le tableau de bord et dans l'app mobile des travailleurs.</li>
            <li>Tu peux ensuite <strong>assigner par téléphone</strong> et marquer dans la liste — chaque travailleur reçoit son service en temps réel.</li>
          </ol>
        </div>
      </div>
    </>
  );
}
