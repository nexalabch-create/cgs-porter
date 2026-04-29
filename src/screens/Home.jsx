import React from 'react';
import { Icon } from '../components/Icons.jsx';
import { NotificationBell } from '../components/NotificationsSheet.jsx';

// Convert "HH:MM" → minutes since midnight, comparing against `now`.
// Returns null if the time has already passed by more than 30 min (no badge),
// "EN COURS" if within ±5 min, or "DANS Xmin / DANS Xh" otherwise.
function nextServiceBadge(timeStr, now = new Date()) {
  if (!timeStr || !/^\d{1,2}:\d{2}$/.test(timeStr)) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const target = new Date(now); target.setHours(h, m, 0, 0);
  const diffMin = Math.round((target - now) / 60000);
  if (diffMin < -5) return null;
  if (diffMin <= 5)  return 'EN COURS';
  if (diffMin < 60)  return `DANS ${diffMin} MIN`;
  return `DANS ${Math.round(diffMin / 60)} H`;
}

export default function HomeScreen({
  firstName = 'Mate', nextService, shift, stats,
  unreadCount = 0, onOpenNotifications,
  onOpenService, onOpenPlanning,
  initials,
}) {
  // Real "now" — was hardcoded during dev. Demo runs on whatever today is.
  const today = new Date();
  const dateLabel = today.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });

  // Badge ticks every 60 s so "DANS 35 MIN" actually decreases.
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const badge = nextServiceBadge(nextService?.time, new Date());
  // tick is referenced so the linter doesn't complain — it's used implicitly
  // to force a re-render on each minute.
  void tick;

  // Real initials from the user profile (was always rendering "<First>P").
  const safeInitials = (initials || (firstName?.[0] || 'P')).toUpperCase();

  return (
    <div className="fade-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f7f7fb', minHeight: 0 }}>
      <div style={{
        background: '#fff',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 18px',
        borderBottom: '1px solid #ececf1',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
              Bonjour {firstName}&nbsp;<span style={{ display: 'inline-block', transform: 'translateY(-1px)' }}>👋</span>
            </div>
            <div style={{ marginTop: 2, fontSize: 13, color: 'var(--muted)', textTransform: 'capitalize' }}>
              {dateLabel}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotificationBell count={unreadCount} onClick={onOpenNotifications}/>
            <div style={{
              width: 40, height: 40, borderRadius: 999, background: 'linear-gradient(135deg, #fce0ee, #fcb6da)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: 'var(--magenta)', fontSize: 14, border: '1.5px solid #fff',
              boxShadow: '0 1px 2px rgba(0,0,0,.06)',
            }}>{safeInitials}</div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { v: stats.services, label: 'services' },
            { v: stats.remaining, label: 'restantes' },
            { v: `CHF\u00A0${stats.cash}`, label: 'aujourd\'hui' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#fafafd', border: '1px solid #ececf1',
              borderRadius: 12, padding: '10px 10px',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
              <div style={{ marginTop: 1, fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          position: 'relative', background: '#fff', borderRadius: 18,
          border: '1px solid #ececf1', padding: '16px 18px 18px 22px', overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(15,15,40,.04)',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--magenta)' }}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--magenta)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Votre prochain service</div>
            {badge && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: badge === 'EN COURS' ? '#9b2c2c' : '#047857',
                background: badge === 'EN COURS' ? '#fee2e2' : '#e8f8f1',
                padding: '3px 8px', borderRadius: 999, letterSpacing: '.06em',
              }}>{badge}</span>
            )}
          </div>

          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {nextService.flight}
            </span>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#9b9bab' }}>·</span>
            <span className="display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {nextService.time}
            </span>
          </div>

          <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em' }}>
            {nextService.client}
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13 }}>
            <Icon.Pin size={14} color="var(--magenta)"/>
            {nextService.meeting}
          </div>

          <button onClick={onOpenService} className="tappable" style={{
            marginTop: 14, width: '100%', height: 46, border: 0, borderRadius: 12,
            background: 'var(--magenta)', color: '#fff',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 14, letterSpacing: '-.005em',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 8px 18px -8px rgba(233,30,140,.55)',
          }}>
            Voir le service <Icon.ChevronRight size={16}/>
          </button>
        </div>

        <div style={{
          background: '#fff', borderRadius: 18, border: '1px solid #ececf1',
          padding: '16px 18px', boxShadow: '0 1px 2px rgba(15,15,40,.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Votre shift aujourd'hui</div>
            <span style={{
              fontSize: 11, fontWeight: 800, color: 'var(--navy)', background: '#eaeaf3',
              padding: '4px 8px', borderRadius: 6, letterSpacing: '.06em',
            }}>{shift.code}</span>
          </div>

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Début</div>
              <div style={{ marginTop: 2, fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{shift.start}</div>
            </div>
            <div style={{ width: 40, color: '#cfcfdc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="10" viewBox="0 0 28 10" fill="none"><path d="M0 5h26M22 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Fin</div>
              <div style={{ marginTop: 2, fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{shift.end}</div>
            </div>
          </div>

          {shift.pause > 0 && (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 10,
              background: '#fafafd', border: '1px solid #ececf1',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                <Icon.Clock size={14}/> Pause
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{shift.pause} min</div>
            </div>
          )}
        </div>

        {/* Single Planning shortcut. The previous "Revenus" tile was a <button>
            with no onClick — silent dead-end on tap. Removed pre-launch. */}
        <button onClick={onOpenPlanning} className="tappable" style={{
          background: '#fff', border: '1px solid #ececf1', borderRadius: 14,
          padding: '14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fcecf4', color: 'var(--magenta)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon.Calendar size={18}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Planning</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Voir mon mois complet</div>
          </div>
          <Icon.ChevronRight size={16} color="#c5c5d0"/>
        </button>
      </div>
    </div>
  );
}
