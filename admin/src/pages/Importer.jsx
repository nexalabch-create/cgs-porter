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

// Compute the Europe/Zurich UTC offset on a given calendar date. Geneva is
// CEST (+02:00) from late March to late October and CET (+01:00) the rest of
// the year. The previous hardcoded `+02:00` silently shifted winter imports
// by one hour. Robust enough for our purposes: ask Intl for the timezone
// short-name on that exact date.
function zurichOffsetFor(dateStr) {
  try {
    const d = new Date(`${dateStr}T12:00:00Z`);
    const tzName = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Zurich', timeZoneName: 'short',
    }).formatToParts(d).find(p => p.type === 'timeZoneName')?.value;
    return tzName === 'CEST' ? '+02:00' : '+01:00';
  } catch { return '+01:00'; }
}

// Tolerant time parser. Accepts "9:30", "09:30", "9.30", "13:0", "13".
// Returns "HH:MM" or null if unparseable.
function parseTime(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/\./g, ':');
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):?(\d{0,2})$/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const mn = m[2] ? Math.min(59, Math.max(0, Number(m[2]))) : 0;
  return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`;
}

// Map a CSV row from the daily-services sheet onto a public.services insert.
// Returns { ok: true, row } on success, or { ok: false, errors } with a list
// of human-readable French error strings for the preview.
function rowToService(row, dateStr) {
  const errors = [];
  const time = parseTime(row.rdv);
  if (!time) errors.push(`heure RDV invalide ("${row.rdv ?? ''}")`);
  const flight = (row.flight_number || row.flight || '').trim();
  if (!flight) errors.push('numéro de vol manquant');
  const source = (row.source || '').toLowerCase().trim();
  if (!['web', 'dnata', 'swissport', 'prive', 'guichet'].includes(source)) {
    errors.push(`source invalide ("${row.source ?? ''}") — attendu : web, dnata, swissport, prive, guichet`);
  }
  const bagsRaw = row.bags ?? '';
  const bags = bagsRaw === '' ? 1 : Number(bagsRaw);
  if (!Number.isFinite(bags) || bags < 1 || bags > 50) {
    errors.push(`nombre de bagages invalide ("${row.bags ?? ''}")`);
  }
  if (errors.length) return { ok: false, errors, raw: row };

  const offset = zurichOffsetFor(dateStr);
  const direction = (row.direction || '').toLowerCase().startsWith('out') ? 'depart' : 'arrivee';
  return {
    ok: true,
    row: {
      service_num: row.service_num ? Number(row.service_num) : null,
      flight,
      scheduled_at: `${dateStr}T${time}:00${offset}`,
      client_name: (row.client_name || row.client || '—').trim(),
      meeting_point: row.meeting_point || `Terminal ${direction === 'arrivee' ? '1' : '2'}`,
      bags,
      base_price_chf: 25,
      per_bag_price_chf: 12,
      status: 'todo',
      agency: source.toUpperCase(),
      client_phone: (row.client_phone || row.phone || '').trim(),
      flow: direction,
      source,
      remarques: (row.remarques || row.notes || '').trim(),
      assigned_porter_id: null,
    },
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
      skipEmptyLines: 'greedy',
      // Auto-detect delimiter: French Excel exports use `;`, plain CSV uses
      // `,`. Empty `delimiter: ''` triggers Papa's auto-sniff which works on
      // both. Older code only handled commas → `;`-files imported as a single
      // mega-column with `null` everywhere.
      delimiter: '',
      // Strip the UTF-8 BOM that Excel inserts on `Save As CSV (UTF-8)` and
      // lowercase + trim header names so `Flight_Number`, `RDV`, `Source`
      // (the literal headings in DNATA/Swissport sheets) all map to our
      // expected snake_case keys without manual intervention.
      transformHeader: (h) => h.replace(/^﻿/, '').trim().toLowerCase(),
      complete: ({ data, errors }) => {
        setParsing(false);
        if (errors.length) {
          setError(`Erreur d'analyse : ${errors[0].message} (ligne ${(errors[0].row ?? 0) + 2})`);
          return;
        }
        if (data.length === 0) {
          setError('CSV vide ou en-têtes manquants.');
          return;
        }
        // Validate every row up-front so the user sees per-row red flags
        // BEFORE clicking Import. Previous flow batched-inserted everything
        // and Postgres rejected the whole batch on the first bad row with
        // a cryptic timestamp error and zero hint about which row.
        const validated = data.map((r, i) => {
          const result = rowToService(r, date);
          return { ...result, lineNumber: i + 2, raw: r };
        });
        setPreview(validated);
      },
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const validRows = React.useMemo(
    () => (preview || []).filter(p => p.ok).map(p => p.row),
    [preview]
  );
  const invalidCount = (preview || []).filter(p => !p.ok).length;

  const importNow = async () => {
    if (!preview) return;
    if (invalidCount > 0) {
      setError(`${invalidCount} ligne${invalidCount > 1 ? 's' : ''} invalide${invalidCount > 1 ? 's' : ''} — corrige le CSV ou importe seulement les lignes valides.`);
      return;
    }
    if (!isSupabaseConfigured) {
      setError("Supabase n'est pas configuré — vérifie .env.local.");
      return;
    }
    setImporting(true);
    setError(null);

    const { data, error: e } = await supabase.from('services').insert(validRows).select('id');
    setImporting(false);
    if (e) {
      setError(`Import échoué : ${e.message}`);
      return;
    }
    setDone({ count: data.length, date });
    setPreview(null);
    setFile(null);
  };

  // Allow user to skip invalid rows and import only the valid ones.
  const importValidOnly = async () => {
    if (!preview || validRows.length === 0) return;
    if (!isSupabaseConfigured) { setError("Supabase n'est pas configuré."); return; }
    setImporting(true);
    setError(null);
    const { data, error: e } = await supabase.from('services').insert(validRows).select('id');
    setImporting(false);
    if (e) { setError(`Import échoué : ${e.message}`); return; }
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
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  3 · Aperçu — {validRows.length} valide{validRows.length > 1 ? 's' : ''}
                  {invalidCount > 0 ? <span className="text-red-600"> · {invalidCount} en erreur</span> : null}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Vérifie avant d'envoyer. Toutes les lignes valides seront créées en statut <code className="bg-slate-100 px-1 py-0.5 rounded">à faire</code> et sans travailleur assigné.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={reset} className="btn-secondary"><X size={16}/> Annuler</button>
                {invalidCount > 0 && validRows.length > 0 ? (
                  <button onClick={importValidOnly} disabled={importing} className="btn-secondary">
                    Importer {validRows.length} valide{validRows.length > 1 ? 's' : ''} (ignorer {invalidCount})
                  </button>
                ) : null}
                <button onClick={importNow} disabled={importing || invalidCount > 0 || validRows.length === 0} className="btn-primary">
                  {importing ? 'Import…' : <><Sparkles size={16}/> Importer {validRows.length} services</>}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 table-head">
                  <tr>
                    <th>Ligne</th><th>#</th><th>Source</th><th>RDV</th><th>Vol</th><th>Dir.</th><th>Client</th><th>Bag.</th><th>Remarques / Erreur</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {preview.map((p, i) => {
                    const r = p.raw || {};
                    const ok = p.ok;
                    return (
                      <tr key={i} className={ok ? '' : 'bg-red-50'}>
                        <td className="font-mono text-xs text-muted">{p.lineNumber}</td>
                        <td className="font-mono text-xs">{r.service_num ?? '—'}</td>
                        <td>
                          <span className="badge bg-slate-100 text-muted uppercase">{r.source ?? '—'}</span>
                        </td>
                        <td className="font-mono text-xs">{r.rdv ?? '—'}</td>
                        <td className="font-display font-semibold">{r.flight_number || r.flight || '—'}</td>
                        <td>
                          <span className={`badge ${(r.direction || '').toLowerCase().startsWith('out') ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {r.direction || '—'}
                          </span>
                        </td>
                        <td className="text-xs">{r.client_name || r.client || '—'}</td>
                        <td className="text-right tabular-nums">{r.bags || ''}</td>
                        <td className="text-xs truncate max-w-[260px]">
                          {ok
                            ? <span className="text-muted">{r.remarques}</span>
                            : <span className="text-red-700 font-semibold">⚠ {p.errors.join(' · ')}</span>}
                        </td>
                      </tr>
                    );
                  })}
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
