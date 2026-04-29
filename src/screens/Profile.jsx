import React from 'react';
import { Icon } from '../components/Icons.jsx';

// Hoisted module-level constants — same identity every render.
// (Skill: vercel-react-best-practices · rendering-hoist-jsx)
const HOURS_DONE = 89.5;
const HOURS_TARGET = 155.75;
const HOURS_PCT = Math.min(100, (HOURS_DONE / HOURS_TARGET) * 100);

const STATS = [
  { v: `${HOURS_DONE}`, sub: `/ ${HOURS_TARGET}h`, label: 'Heures ce mois', accent: 'var(--magenta)' },
  { v: '12',            sub: '/ 22 jours',         label: 'Jours travaillés' },
  { v: '34',            sub: 'services',           label: 'Complétés' },
  { v: '1\u00A0240',    sub: 'CHF',                label: 'Générés', accent: 'var(--navy)' },
];

const RECENT = [
  { flight: 'AF231',  client: 'M. & Mme Tanaka', time: 'Auj. · 11:15',     amount: 85 },
  { flight: 'LH1180', client: 'Dr. Schmidt',     time: 'Hier · 17:40',     amount: 49 },
  { flight: 'EK85',   client: 'Mr. Patel',       time: '23 avril · 09:20', amount: 73 },
];

export default function ProfileScreen({ user, onLogout }) {
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Mate Torgvaidze';
  const initials = user?.initials || 'MT';
  const roleLabel = user?.role === 'chef' ? "Chef d'équipe" : 'Travailleur';

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
        <div style={{
          background: '#fff', border: '1px solid #ececf1', borderRadius: 18,
          padding: '16px 18px', boxShadow: '0 1px 2px rgba(15,15,40,.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Heures ce mois</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--magenta)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(HOURS_PCT)}%</div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.025em', fontVariantNumeric: 'tabular-nums' }}>{HOURS_DONE}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>/ {HOURS_TARGET}h</span>
          </div>
          <div style={{
            marginTop: 10, height: 8, background: '#f1f1f5', borderRadius: 999, overflow: 'hidden',
          }}>
            <div style={{
              width: HOURS_PCT + '%', height: '100%',
              background: 'linear-gradient(90deg, var(--magenta), #ff5fb1)',
              borderRadius: 999, transition: 'width .4s ease',
            }}/>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid #ececf1', borderRadius: 14,
              padding: '14px', boxShadow: '0 1px 2px rgba(15,15,40,.04)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{
                  fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums',
                  color: s.accent || 'var(--ink)',
                }}>{s.v}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{s.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: '#fff', border: '1px solid #ececf1', borderRadius: 18,
          padding: '4px 18px', boxShadow: '0 1px 2px rgba(15,15,40,.04)',
        }}>
          <div style={{ padding: '14px 0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Derniers services</div>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 12, color: 'var(--magenta)', fontWeight: 600, textDecoration: 'none' }}>Tout voir</a>
          </div>
          {RECENT.map((r, i) => (
            <div key={i} style={{
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
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.005em' }}>
                  {r.flight} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· {r.client}</span>
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: 'var(--muted)' }}>{r.time}</div>
              </div>
              <div style={{
                fontSize: 13, fontWeight: 800, color: 'var(--navy)', fontVariantNumeric: 'tabular-nums',
              }}>CHF {r.amount}</div>
            </div>
          ))}
        </div>

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
          CGS PORTER · v2.4.1
        </div>
      </div>
    </div>
  );
}
