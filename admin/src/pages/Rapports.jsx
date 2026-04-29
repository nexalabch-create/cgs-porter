import React from 'react';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import PageHeader from '../components/PageHeader.jsx';
import { useServicesData } from '../hooks/useServices.js';
import {
  formatCHF, totalChf, SOURCE_LABEL, SOURCE_COLOR,
} from '../lib/format.js';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

export default function Rapports() {
  const { services, porters, porterById, isLoading } = useServicesData();

  // Default range: this month. Was hardcoded to 2026-04-25 — that anchor
  // date silently cut every chart and KPI off in April, so on May 1 the
  // page would render "0 services / 0 CHF / 0 jours". Use the live date.
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Local YYYY-MM-DD (avoid toISOString which converts to UTC and can shift
  // a day backward for users east of UTC near midnight).
  const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const [from, setFrom] = React.useState(isoDay(firstOfMonth));
  const [to,   setTo]   = React.useState(isoDay(today));

  const inRange = React.useCallback((iso) => {
    const d = new Date(iso); d.setHours(0,0,0,0);
    const a = new Date(from); a.setHours(0,0,0,0);
    const b = new Date(to);   b.setHours(23,59,59,999);
    return d >= a && d <= b;
  }, [from, to]);

  const range = services.filter(s => inRange(s.scheduled_at));
  const totalCount = range.length;
  const totalChfRange = range.reduce((s, x) => s + totalChf(x), 0);
  const days = Math.max(1, Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1);
  const avgPerDay = (totalCount / days).toFixed(1);

  // Previous period
  const periodMs = (new Date(to) - new Date(from));
  const prevTo = new Date(new Date(from).getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - periodMs);
  const prev = services.filter(s => {
    const d = new Date(s.scheduled_at);
    return d >= prevFrom && d <= prevTo;
  });
  const deltaCount = prev.length === 0 ? null : ((totalCount - prev.length) / prev.length) * 100;
  const prevChf = prev.reduce((s, x) => s + totalChf(x), 0);
  const deltaChf = prevChf === 0 ? null : ((totalChfRange - prevChf) / prevChf) * 100;

  // By source
  const bySource = ['web', 'dnata', 'swissport', 'prive'].map(src => {
    const rows = range.filter(s => s.source === src);
    return {
      src, count: rows.length, chf: rows.reduce((a, x) => a + totalChf(x), 0),
    };
  });
  const sourceTotalCount = bySource.reduce((s, x) => s + x.count, 0) || 1;

  // By porter
  const byPorter = porters.map(p => {
    const rows = range.filter(s => s.assigned_porter_id === p.id);
    const chf = rows.reduce((a, x) => a + totalChf(x), 0);
    return {
      ...p,
      count: rows.length,
      chf,
      hours: (rows.length * 0.5),
      avgChf: rows.length ? chf / rows.length : 0,
    };
  }).filter(p => p.count > 0).sort((a, b) => b.chf - a.chf);

  // Last 90-day daily revenue line
  const last90 = [];
  for (let d = 89; d >= 0; d--) {
    const day = new Date(today); day.setDate(day.getDate() - d); day.setHours(0,0,0,0);
    const next = new Date(day); next.setDate(next.getDate() + 1);
    const chf = services
      .filter(s => { const x = new Date(s.scheduled_at); return x >= day && x < next; })
      .reduce((a, x) => a + totalChf(x), 0);
    last90.push({ label: day.toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' }), chf });
  }

  const pieData = {
    labels: bySource.map(b => SOURCE_LABEL[b.src]),
    datasets: [{
      data: bySource.map(b => b.count),
      backgroundColor: bySource.map(b => SOURCE_COLOR[b.src]),
      borderWidth: 0,
    }],
  };
  const lineData = {
    labels: last90.map(d => d.label),
    datasets: [{
      label: 'CA quotidien',
      data: last90.map(d => d.chf),
      borderColor: '#e91e8c',
      backgroundColor: 'rgba(233,30,140,0.08)',
      fill: true,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    }],
  };

  return (
    <>
      {/* Export buttons removed pre-launch — they were alert() stubs.
          Re-enable once a real PDF/Excel export pipeline ships (server-side
          via Edge Function + jspdf or similar). */}
      <PageHeader title="Rapports" subtitle="Analyse de la performance sur la période sélectionnée."/>

      <div className="px-8 py-6 space-y-6">
        <div className="card p-4 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="label">Du</span>
            <input type="date" className="input mt-1.5" value={from} onChange={(e) => setFrom(e.target.value)}/>
          </label>
          <label className="block">
            <span className="label">Au</span>
            <input type="date" className="input mt-1.5" value={to} onChange={(e) => setTo(e.target.value)}/>
          </label>
          <div className="text-xs text-muted">{days} jour{days > 1 ? 's' : ''} · {totalCount} service{totalCount > 1 ? 's' : ''}</div>
        </div>

        <Section title="Vue générale">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Total services" value={totalCount} delta={deltaCount}/>
            <Stat label="CA total"       value={formatCHF(totalChfRange)} delta={deltaChf}/>
            <Stat label="Moyenne / jour" value={avgPerDay}/>
            <Stat label="CA moy. / service" value={formatCHF(totalCount ? totalChfRange / totalCount : 0)}/>
          </div>
        </Section>

        <Section title="Par source">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 lg:col-span-2 overflow-hidden">
              <table className="w-full">
                <thead className="table-head">
                  <tr><th>Source</th><th className="text-right">Services</th><th className="text-right">% du total</th><th className="text-right">CA</th></tr>
                </thead>
                <tbody className="table-body">
                  {bySource.map(b => (
                    <tr key={b.src}>
                      <td>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: SOURCE_COLOR[b.src] }}/>
                          {SOURCE_LABEL[b.src]}
                        </span>
                      </td>
                      <td className="text-right tabular-nums font-semibold">{b.count}</td>
                      <td className="text-right tabular-nums">{((b.count / sourceTotalCount) * 100).toFixed(1)}%</td>
                      <td className="text-right tabular-nums font-semibold">{formatCHF(b.chf)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card p-5">
              <div className="h-60">
                <Pie data={pieData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
                }}/>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Par travailleur">
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 table-head">
                <tr>
                  <th>Travailleur</th>
                  <th className="text-right">Services</th>
                  <th className="text-right">Heures</th>
                  <th className="text-right">CA total</th>
                  <th className="text-right">CA moyen</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {byPorter.map(p => (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.first_name} {p.last_name}</td>
                    <td className="text-right tabular-nums">{p.count}</td>
                    <td className="text-right tabular-nums">{p.hours.toFixed(1)}h</td>
                    <td className="text-right tabular-nums font-semibold">{formatCHF(p.chf)}</td>
                    <td className="text-right tabular-nums">{formatCHF(p.avgChf)}</td>
                  </tr>
                ))}
                {byPorter.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted py-8">Aucun service sur la période.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Tendances · 3 derniers mois">
          <div className="card p-5">
            <div className="h-72">
              <Line data={lineData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#6b6b7a', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
                  y: { beginAtZero: true, grid: { color: '#f1f1f5' }, ticks: { color: '#6b6b7a', font: { size: 11 } } },
                },
              }}/>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold tracking-tight mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value, delta }) {
  return (
    <div className="card p-5">
      <div className="label">{label}</div>
      <div className="font-display text-2xl font-semibold tracking-tight tabular-nums mt-2">{value}</div>
      {delta != null ? (
        <div className={`text-xs font-semibold mt-2 ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% vs période précédente
        </div>
      ) : null}
    </div>
  );
}
