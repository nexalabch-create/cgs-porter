import React from 'react';
import { PORTERS } from '../data/porters.js';

export default function AssignSheet({ open, service, onClose, onAssign }) {
  const [query, setQuery] = React.useState('');
  React.useEffect(() => { if (open) setQuery(''); }, [open]);

  if (!open) return null;

  const porters = PORTERS.filter(p => p.role === 'porter');
  const q = query.trim().toLowerCase();
  const filtered = q
    ? porters.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q))
    : porters;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(15,15,40,.4)', zIndex: 30,
        animation: 'sheetFade .2s ease',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, top: 60,
        background: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
        zIndex: 31, display: 'flex', flexDirection: 'column',
        animation: 'sheetUp .25s cubic-bezier(.2,.8,.2,1)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{ width: 44, height: 5, background: '#e0e0ea', borderRadius: 999, margin: '10px auto 12px' }}/>

        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--magenta)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Assigner un porteur</div>
          {service && (
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em' }}>
              {service.flight} · {service.time} <span style={{ fontWeight: 500, color: 'var(--muted)' }}>· {service.client}</span>
            </div>
          )}

          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un porteur…"
            style={{
              marginTop: 12, width: '100%', height: 42, padding: '0 14px',
              fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)',
              border: '1.5px solid #e7e7ee', borderRadius: 12, outline: 'none',
              background: '#fff',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--magenta)'}
            onBlur={(e) => e.target.style.borderColor = '#e7e7ee'}
          />
        </div>

        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '32px 8px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              Aucun porteur trouvé.
            </div>
          )}
          {filtered.map(p => (
            <button key={p.id} onClick={() => onAssign(p.id)} className="tappable" style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px', marginBottom: 8, border: '1px solid #ececf1', borderRadius: 14,
              background: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 999,
                background: 'linear-gradient(135deg, #fce0ee, #fcb6da)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, color: 'var(--magenta)', fontSize: 14, flexShrink: 0,
              }}>{p.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.005em' }}>
                  {p.firstName} {p.lastName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Porteur · GVA</div>
              </div>
              <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink: 0, color: '#cfcfdc' }}>
                <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>

        <div style={{ padding: '8px 20px 16px', borderTop: '1px solid #ececf1' }}>
          <button onClick={onClose} className="tappable" style={{
            width: '100%', height: 46, border: '1.5px solid #e7e7ee', background: '#fff',
            borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: 14, color: 'var(--ink)', cursor: 'pointer',
          }}>Annuler</button>
        </div>
      </div>
    </>
  );
}
