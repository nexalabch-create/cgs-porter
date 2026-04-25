import { TrendingUp, TrendingDown } from 'lucide-react';

export default function MetricCard({ label, value, hint, delta, accent = 'ink', icon: Icon }) {
  const accentClass = accent === 'magenta' ? 'text-magenta'
                    : accent === 'navy'    ? 'text-navy'
                    : 'text-ink';
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="label">{label}</div>
        {Icon ? (
          <div className="h-9 w-9 rounded-lg bg-magenta-50 text-magenta flex items-center justify-center">
            <Icon size={18} strokeWidth={1.9} />
          </div>
        ) : null}
      </div>
      <div className={`font-display text-3xl font-semibold tracking-tight tabular-nums ${accentClass}`}>
        {value}
      </div>
      {hint || delta != null ? (
        <div className="flex items-center gap-2 text-xs">
          {delta != null ? (
            <span className={`inline-flex items-center gap-1 font-semibold ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {delta >= 0 ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
              {Math.abs(delta).toFixed(1)}%
            </span>
          ) : null}
          {hint ? <span className="text-muted">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
