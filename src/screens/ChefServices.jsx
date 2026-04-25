import React from 'react';
import { Icon } from '../components/Icons.jsx';
import { StatusPill } from './Services.jsx';
import { findPorter, porterDisplayName } from '../data/porters.js';

const FILTERS = [
  { id: 'all',        label: 'Tous' },
  { id: 'unassigned', label: 'Non assignés' },
  { id: 'assigned',   label: 'Assignés' },
  { id: 'done',       label: 'Terminés' },
];

function PorterChip({ porterId }) {
  const p = findPorter(porterId);
  if (!p) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: '#fee2e2', color: '#b91c1c',
        fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
        letterSpacing: '-.005em',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: '#dc2626' }}/>
        Non assigné
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: '#fafafd', border: '1px solid #ececf1',
      fontSize: 11, fontWeight: 700, color: 'var(--ink)',
      padding: '3px 8px 3px 3px', borderRadius: 999, letterSpacing: '-.005em',
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 999,
        background: 'linear-gradient(135deg, #fce0ee, #fcb6da)',
        color: 'var(--magenta)', fontSize: 9, fontWeight: 800,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>{p.initials}</span>
      {porterDisplayName(p)}
    </span>
  );
}

function ChefCard({ s, onOpen, index = 0 }) {
  return (
    <div onClick={onOpen} className="tappable stagger-in" style={{
      ['--stagger']: index,
      position: 'relative', background: '#fff',
      borderRadius: 16, padding: '14px 14px 14px 18px',
      border: '1px solid #ececf1',
      boxShadow: '0 1px 2px rgba(15,15,40,.04)',
      cursor: 'pointer', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: s.assignedPorterId ? 'var(--magenta)' : 'var(--red)',
      }}/>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span className="display" style={{ fontSize: 23, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{s.flight}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#9b9bab' }}>·</span>
          <span className="display" style={{ fontSize: 23, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{s.time}</span>
        </div>
        <StatusPill status={s.status}/>
      </div>

      <div style={{ marginTop: 4, fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.005em' }}>
        {s.client}
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <PorterChip porterId={s.assignedPorterId}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#f6f6fa', color: 'var(--ink)', fontSize: 12, fontWeight: 600,
            padding: '4px 8px', borderRadius: 8,
          }}>
            <Icon.Bag size={12}/> {s.bags}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'var(--navy)', color: '#fff', fontSize: 12, fontWeight: 700,
            padding: '4px 8px', borderRadius: 8, fontVariantNumeric: 'tabular-nums',
          }}>
            CHF {s.price}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ChefServicesScreen({ user, services, onOpen }) {
  const [filter, setFilter] = React.useState('all');
  // Real "now" — was hardcoded during dev. Same fix as ChefHome.jsx + Home.jsx.
  const today = new Date();
  const dateLabel = today.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });

  const counts = {
    all: services.length,
    unassigned: services.filter(s => !s.assignedPorterId).length,
    assigned: services.filter(s => s.assignedPorterId && s.status !== 'done').length,
    done: services.filter(s => s.status === 'done').length,
  };

  const visible = services.filter(s => {
    if (filter === 'unassigned') return !s.assignedPorterId;
    if (filter === 'assigned')   return s.assignedPorterId && s.status !== 'done';
    if (filter === 'done')       return s.status === 'done';
    return true;
  });

  return (
    <div className="fade-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f7f7fb', minHeight: 0 }}>
      <div style={{
        background: '#fff',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 14px',
        borderBottom: '1px solid #ececf1',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
              Services équipe
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
          }}>{user.initials}</div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="display" style={{ fontSize: 34, fontWeight: 700, color: 'var(--magenta)', fontVariantNumeric: 'tabular-nums' }}>
            {services.length}
          </span>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.01em' }}>
            services aujourd'hui
          </span>
        </div>

        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="live-dot"/>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>
            En direct · mis à jour il y a 30s
          </span>
        </div>

        <div className="scroll" style={{
          marginTop: 14, display: 'flex', gap: 6, overflowX: 'auto',
          paddingBottom: 2, marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20,
        }}>
          {FILTERS.map(f => {
            const active = filter === f.id;
            const count = counts[f.id];
            const showCount = f.id !== 'all' || true;
            const danger = f.id === 'unassigned' && count > 0;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} className="tappable" style={{
                flexShrink: 0, height: 34, padding: '0 12px',
                border: '1px solid ' + (active ? 'var(--magenta)' : '#ececf1'),
                background: active ? 'var(--magenta)' : '#fff',
                color: active ? '#fff' : (danger ? 'var(--red)' : 'var(--ink)'),
                fontFamily: 'inherit', fontSize: 13, fontWeight: 700, letterSpacing: '-.005em',
                borderRadius: 999, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                {f.label}
                {showCount && (
                  <span style={{
                    minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
                    background: active ? 'rgba(255,255,255,.22)' : (danger ? '#fee2e2' : '#f1f1f5'),
                    color: active ? '#fff' : (danger ? '#b91c1c' : 'var(--muted)'),
                    fontSize: 10.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.length === 0 && (
          <div style={{
            marginTop: 24, padding: '40px 24px', textAlign: 'center',
            background: '#fff', border: '1px dashed #e0e0ea', borderRadius: 16,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Aucun service</div>
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)' }}>
              Aucun service ne correspond à ce filtre.
            </div>
          </div>
        )}
        {visible.map((s, i) => (
          // Cap stagger to 6 — beyond that the animation-delay (i × 55ms) pushes
          // late cards into seconds-long delays, which iOS Safari's GPU rasterizer
          // can render with subpixel artifacts ("haloed" text). First 6 keep the
          // delight; the rest snap in.
          <ChefCard key={s.id} s={s} index={Math.min(i, 6)} onOpen={() => onOpen(s.id)}/>
        ))}
      </div>
    </div>
  );
}
