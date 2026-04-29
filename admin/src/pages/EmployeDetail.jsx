import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import MetricCard from '../components/MetricCard.jsx';
import EmployeeModal from '../components/EmployeeModal.jsx';
import { useServicesData } from '../hooks/useServices.js';
import {
  formatCHF, formatDate, formatTime, totalChf,
  STATUS_LABEL, STATUS_STYLES,
} from '../lib/format.js';

export default function EmployeDetail() {
  const { id } = useParams();
  const { porters, services, isLoading } = useServicesData();
  const [editOpen, setEditOpen] = React.useState(false);
  const [localOverride, setLocalOverride] = React.useState(null);

  const fetchedEmployee = porters.find(p => p.id === id);
  // After save, override locally so the page reflects the change without
  // waiting for the next useServicesData() refetch.
  const employee = localOverride && localOverride.id === id ? localOverride : fetchedEmployee;
  const mine = services.filter(s => s.assigned_porter_id === id);
  // "today" must be the actual current date — was hardcoded to 2026-04-25
  // which made every employee show 0 services / 0 CHF after April rolled over.
  const today = new Date();
  const month = mine.filter(s => {
    const d = new Date(s.scheduled_at);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  });
  const monthChf = month.reduce((acc, s) => acc + totalChf(s), 0);
  const last10 = mine.slice().sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)).slice(0, 10);

  // While the porters list is still loading, show a loading state
  // instead of the misleading "Employé introuvable" error.
  if (isLoading) {
    return (
      <>
        <PageHeader title="Chargement…"/>
        <div className="px-8 py-10 text-sm text-muted">
          <Link to="/employes" className="btn-secondary"><ArrowLeft size={16}/> Retour</Link>
        </div>
      </>
    );
  }

  if (!employee) {
    return (
      <>
        <PageHeader title="Employé introuvable"/>
        <div className="px-8 py-10">
          <Link to="/employes" className="btn-secondary"><ArrowLeft size={16}/> Retour</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${employee.first_name} ${employee.last_name}`}
        subtitle={`${employee.role === 'chef' ? "Chef d'équipe" : 'Travailleur'} · ${employee.email}`}>
        <Link to="/employes" className="btn-secondary"><ArrowLeft size={16}/> Retour</Link>
        <button onClick={() => setEditOpen(true)} className="btn-primary">
          <Pencil size={16}/> Modifier
        </button>
      </PageHeader>

      <EmployeeModal
        open={editOpen}
        employee={employee}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setLocalOverride(updated);
        }}
      />

      <div className="px-8 py-6 space-y-6">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-magenta-100 to-magenta-200 text-magenta flex items-center justify-center font-display font-bold text-2xl">
            {employee.initials || (employee.first_name?.[0] ?? '') + (employee.last_name?.[0] ?? '')}
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {employee.first_name} {employee.last_name}
            </h2>
            <div className="text-sm text-muted mt-1">
              {employee.email} · GVA-Station
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Services ce mois" value={month.length} accent="ink" />
          <MetricCard label="CA généré" value={formatCHF(monthChf)} accent="magenta" />
          <MetricCard label="Heures (estim.)" value={`${(month.length * 0.5).toFixed(1)}h`} hint="≈ 30 min / service" />
          <MetricCard label="Services terminés" value={month.filter(s => s.status === 'done').length} accent="navy" />
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-display text-lg font-semibold tracking-tight">10 derniers services</h3>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 table-head">
              <tr>
                <th>Date</th><th>Heure</th><th>Vol</th><th>Client</th>
                <th className="text-right">CHF</th><th>Statut</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {last10.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted py-8">Aucun service.</td></tr>
              )}
              {last10.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="text-xs text-muted">{formatDate(s.scheduled_at)}</td>
                  <td className="font-mono text-xs">{formatTime(s.scheduled_at)}</td>
                  <td className="font-display font-semibold">{s.flight}</td>
                  <td className="truncate max-w-[200px]">{s.client_name}</td>
                  <td className="text-right tabular-nums font-semibold">{formatCHF(totalChf(s))}</td>
                  <td><span className={`badge ${STATUS_STYLES[s.status]}`}>{STATUS_LABEL[s.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
