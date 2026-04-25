import React from 'react';
import { Icon } from '../components/Icons.jsx';

export default function HomeScreen({ firstName = 'Mate', nextService, shift, stats, onOpenService, onOpenPlanning }) {
  const today = new Date(2026, 3, 25);
  const dateLabel = today.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });

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
          <div style={{
            width: 40, height: 40, borderRadius: 999, background: 'linear-gradient(135deg, #fce0ee, #fcb6da)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, color: 'var(--magenta)', fontSize: 14, border: '1.5px solid #fff',
            boxShadow: '0 1px 2px rgba(0,0,0,.06)',
          }}>MT</div>
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
            <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: '#e8f8f1', padding: '3px 8px', borderRadius: 999, letterSpacing: '.06em' }}>DANS 35 MIN</span>
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
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={onOpenPlanning} className="tappable" style={{
            background: '#fff', border: '1px solid #ececf1', borderRadius: 14,
            padding: '14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fcecf4', color: 'var(--magenta)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Calendar size={16}/>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Planning</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Voir mon mois</div>
          </button>
          <button className="tappable" style={{
            background: '#fff', border: '1px solid #ececf1', borderRadius: 14,
            padding: '14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#eaeaf3', color: 'var(--navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Cash size={16}/>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Revenus</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Ce mois</div>
          </button>
        </div>
      </div>
    </div>
  );
}
