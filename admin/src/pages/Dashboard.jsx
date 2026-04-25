import React from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale,
  Tooltip, Legend, ArcElement,
} from 'chart.js';
import { CalendarRange, Wallet, ListChecks, Users } from 'lucide-react';

import PageHeader from '../components/PageHeader.jsx';
import MetricCard from '../components/MetricCard.jsx';
import { useDashboardData } from '../hooks/useDashboardData.js';
import {
  formatCHF, formatTime, totalChf, SOURCE_LABEL, SOURCE_COLOR,
  STATUS_LABEL, STATUS_STYLES, shortName,
} from '../lib/format.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement);

export default function Dashboard() {
  const { metrics, byDay, bySource, recent, topPorters, isLoading } = useDashboardData();

  const barData = React.useMemo(() => ({
    labels: byDay.map(d => d.label),
    datasets: [{
      label: 'Services',
      data: byDay.map(d => d.count),
      backgroundColor: '#e91e8c',
      borderRadius: 6,
      barThickness: 10,
    }],
  }), [byDay]);

  const barOptions = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#0b0b1a', padding: 10, displayColors: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b6b7a', font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: '#f1f1f5' }, ticks: { color: '#6b6b7a', font: { size: 11 }, stepSize: 1 } },
    },
  }), []);

  const donutData = React.useMemo(() => ({
    labels: bySource.map(s => SOURCE_LABEL[s.source]),
    datasets: [{
      data: bySource.map(s => s.count),
      backgroundColor: bySource.map(s => SOURCE_COLOR[s.source]),
      borderWidth: 0,
    }],
  }), [bySource]);

  const donutOptions = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14, font: { size: 12 } } },
      tooltip: { backgroundColor: '#0b0b1a', padding: 10 },
    },
  }), []);

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={isLoading ? 'Chargement…' : 'Vue d\'ensemble de l\'activité du jour et du mois.'}
      />

      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Services aujourd'hui" value={metrics.todayCount} icon={ListChecks} accent="ink" />
          <MetricCard label="CA aujourd'hui" value={formatCHF(metrics.todayChf)} icon={Wallet} accent="magenta" />
          <MetricCard label="Services ce mois" value={metrics.monthCount} icon={CalendarRange} accent="ink" />
          <MetricCard label="CA ce mois" value={formatCHF(metrics.monthChf)} icon={Users} accent="navy" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold tracking-tight">Services / 30 derniers jours</h3>
              <span className="text-xs text-muted">{byDay.reduce((s, d) => s + d.count, 0)} services au total</span>
            </div>
            <div className="h-72">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-display text-lg font-semibold tracking-tight mb-4">Source des réservations</h3>
            <div className="h-72">
              <Doughnut data={donutData} options={donutOptions} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold tracking-tight">5 derniers services aujourd'hui</h3>
              <span className="badge bg-emerald-50 text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> En direct
              </span>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50 table-head">
                <tr>
                  <th>Heure</th><th>Vol</th><th>Client</th><th>Porteur</th><th className="text-right">CHF</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {recent.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted py-8">Aucun service aujourd'hui.</td></tr>
                )}
                {recent.map(s => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">{formatTime(s.scheduled_at)}</td>
                    <td className="font-display font-semibold">{s.flight}</td>
                    <td className="truncate max-w-[180px]">{s.client_name}</td>
                    <td className="text-muted text-xs">{shortName(s.porter)}</td>
                    <td className="text-right font-semibold tabular-nums">{formatCHF(totalChf(s))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-display text-lg font-semibold tracking-tight">Top 5 porteurs ce mois</h3>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50 table-head">
                <tr>
                  <th>Porteur</th><th className="text-right">Services</th><th className="text-right">CA</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {topPorters.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-muted py-8">Pas encore d'activité.</td></tr>
                )}
                {topPorters.map((p, i) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-magenta/10 text-magenta flex items-center justify-center text-xs font-bold">
                          {p.initials}
                        </div>
                        <div className="text-sm">
                          <div className="font-semibold">{p.first_name} {p.last_name}</div>
                          <div className="text-[11px] text-muted">#{i + 1}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right tabular-nums font-semibold">{p.serviceCount}</td>
                    <td className="text-right tabular-nums font-semibold">{formatCHF(p.totalChf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
