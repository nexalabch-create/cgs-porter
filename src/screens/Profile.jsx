import React from 'react';
import { Icon } from '../components/Icons.jsx';

export default function ProfileScreen({ user, onLogout, services = [] }) {
  const fullName = user ? `${user.firstName} ${user.lastName}` : '—';
  const initials = user?.initials || '··';
  const roleLabel = user?.role === 'chef' ? "Chef d'équipe" : 'Travailleur';

  // Compute real stats from the user's own services. Replaced the previous
  // hardcoded mock (89.5h / 1240 CHF / "AF231 Tanaka") which showed the same
  // fictional history to every real porter — embarrassing post-launch.
  const stats = React.useMemo(() => {
    if (!user?.id) return { count: 0, completed: 0, chf: 0, recent: [] };
    const now = new Date();
    const yr = now.getFullYear(), mo = now.getMonth();
    const mine = services.filter(s => s.assignedPorterId === user.id);
    const month = mine.filter(s => {
      const d = s.scheduledAt ? new Date(s.scheduledAt) : null;
      return d && d.getFullYear() === yr && d.getMonth() === mo;
    });
    const completed = month.filter(s => s.status === 'done');
    const chf = completed.reduce((acc, s) => acc + (s.price || 0), 0);
    const recent = mine
      .slice()
      .sort((a, b) => new Date(b.scheduledAt || 0) - new Date(a.scheduledAt || 0))
      .slice(0, 3);
    return { count: month.length, completed: completed.length, chf, recent };
  }, [services, user?.id]);

  const fmtRecentDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    const isYest = d.toDateString() === yest.toDateString();
    const time = d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
    if (sameDay)  return `Auj. · ${time}`;
    if (isYest)   return `Hier · ${time}`;
    return d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long' }) + ' · ' + time;
  };

  return (
    <div className="fade-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f7f7fb', minHeight: 0 }}>
      <div style={{
        background: 'linear-gradient(180deg, #fff 0%, #fff 70%, #f7f7fb 100%)',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 14px',
        borderBottom: '1px solid #ececf1',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--magenta)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Profil</div>

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 999,
            background: 'linear-gradient(135deg, #fce0ee, #fcb6da)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: 'var(--magenta)', fontSize: 22,
            border: '2px solid #fff', boxShadow: '0 4px 14px rgba(233,30,140,.18)',
            letterSpacing: '-.02em',
          }}>{initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em' }}>
              {fullName}
            </div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                background: 'var(--navy)', color: '#fff',
                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                letterSpacing: '.04em',
              }}>{roleLabel}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                <Icon.Pin size={12}/> GVA-Station
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Real stats from this porter's own services this calendar month. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { v: stats.count,     label: 'Services ce mois', accent: 'var(--magenta)' },
            { v: stats.completed, label: 'Complétés' },
            { v: `CHF ${stats.chf}`, label: 'Générés', accent: 'var(--navy)' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid #ececf1', borderRadius: 14,
              padding: '14px 12px', boxShadow: '0 1px 2px rgba(15,15,40,.04)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{
                marginTop: 6, fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums',
                color: s.accent || 'var(--ink)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{s.v}</div>
            </div>
          ))}
        </div>

        {stats.recent.length > 0 ? (
          <div style={{
            background: '#fff', border: '1px solid #ececf1', borderRadius: 18,
            padding: '4px 18px', boxShadow: '0 1px 2px rgba(15,15,40,.04)',
          }}>
            <div style={{ padding: '14px 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
              Derniers services
            </div>
            {stats.recent.map((r, i) => (
              <div key={r.id || i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderTop: '1px solid #f1f1f5',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, background: '#fcecf4', color: 'var(--magenta)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon.Plane size={16}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.005em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {r.flight} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· {r.client}</span>
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: 'var(--muted)' }}>{fmtRecentDate(r.scheduledAt)}</div>
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 800, color: 'var(--navy)', fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                }}>CHF {r.price || 0}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: '#fff', border: '1px dashed #e0e0ea', borderRadius: 18,
            padding: '28px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Aucun service récent</div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              Vos services apparaîtront ici dès que vous en aurez complété.
            </div>
          </div>
        )}

        <button onClick={onLogout} className="tappable" style={{
          marginTop: 6, width: '100%', height: 52,
          border: '1px solid #fbd0e2',
          background: 'linear-gradient(135deg, #fff5fa 0%, #fde6f0 100%)',
          color: 'var(--magenta)', borderRadius: 14,
          fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
          letterSpacing: '-.005em', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.7)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Se déconnecter
        </button>
        <div style={{
          marginTop: 18, marginBottom: 4,
          textAlign: 'center', fontSize: 10.5, color: '#b5b5c2',
          letterSpacing: '.06em', fontWeight: 600,
        }}>
          CGS PORTER · v2.5.0
        </div>
      </div>
    </div>
  );
}
