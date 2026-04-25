import React from 'react';
import { Upload, List, CalendarDays as CalIcon } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';

// Stub — full calendar + PDF roster parsing TODO. Structure ready, real data
// flows in via the `shifts` table once Supabase is wired up.
export default function Planning() {
  const [view, setView] = React.useState('calendar');

  return (
    <>
      <PageHeader title="Planning" subtitle="Calendrier mensuel et plannings des employés.">
        <div className="inline-flex items-center bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setView('calendar')}
            className={`h-8 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              view === 'calendar' ? 'bg-white shadow-sm text-magenta' : 'text-muted'
            }`}>
            <CalIcon size={14}/> Calendrier
          </button>
          <button
            onClick={() => setView('list')}
            className={`h-8 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              view === 'list' ? 'bg-white shadow-sm text-magenta' : 'text-muted'
            }`}>
            <List size={14}/> Liste
          </button>
        </div>
        <button className="btn-primary"><Upload size={16}/> Importer roster PDF</button>
      </PageHeader>

      <div className="px-8 py-6">
        <div className="card p-12 text-center">
          <div className="font-display text-2xl font-semibold tracking-tight">
            Planning · {view === 'calendar' ? 'Calendrier' : 'Liste'}
          </div>
          <p className="mt-3 text-sm text-muted max-w-lg mx-auto leading-relaxed">
            Cette page est prête à être branchée sur la table <code className="bg-slate-100 px-1.5 py-0.5 rounded">public.shifts</code>.
            L'import PDF roster (parsing automatique) nécessite une intégration <code>pdf.js</code> + parser dédié — à prioriser séparément.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-xs text-muted">
            <span className="h-2 w-2 rounded-full bg-amber-500 inline-block"/>
            À implémenter
          </div>
        </div>
      </div>
    </>
  );
}
