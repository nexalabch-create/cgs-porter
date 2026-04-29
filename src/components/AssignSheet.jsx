import React from 'react';
import { PORTERS } from '../data/porters.js';
import { isSupabaseConfigured } from '../lib/supabase.js';

// AssignSheet now accepts a `users` prop (real Supabase users with UUIDs).
// Falls back to the static PORTERS demo array when Supabase isn't configured
// (or while users are still loading). The shape is normalized in either case
// to { id, firstName, lastName, role, initials }.

// Same gradient cycler used in ChefHome — keeps the brand language unified.
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #fcecf4 0%, #f8a8d4 100%)',
  'linear-gradient(135deg, #f5e6f8 0%, #d896e8 100%)',
  'linear-gradient(135deg, #fef0f5 0%, #f7b3c9 100%)',
  'linear-gradient(135deg, #f9e6ed 0%, #e89bbf 100%)',
];
function hashIdx(s, n) {
  if (!s) return 0;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % n;
}

export default function AssignSheet({ open, service, onClose, onAssign, users }) {
  const [query, setQuery] = React.useState('');
  React.useEffect(() => { if (open) setQuery(''); }, [open]);

  if (!open) return null;

  // CRITICAL: when Supabase is configured we must NEVER fall back to PORTERS,
  // because PORTERS' string IDs ('p2', 'mt'…) silently fail the UPDATE on
  // assigned_porter_id (uuid column). If users hasn't loaded yet, we render
  // a loading spinner instead. Only in pure demo mode (no Supabase env vars)
  // do we use PORTERS as the source.
  const sbReady = isSupabaseConfigured();
  const stillLoading = sbReady && (!users || users.length === 0);
  const source = stillLoading ? [] : (sbReady ? users : PORTERS);
  const all = source.filter(p => p.role === 'porter' || p.role === 'chef');
  const q = query.trim().toLowerCase();
  const filtered = (q
    ? all.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q))
    : all
  ).sort((a, b) => {
    if (a.role !== b.role) return a.role === 'chef' ? -1 : 1;
    return a.firstName.localeCompare(b.firstName);
  });

  const chefCount = filtered.filter(p => p.role === 'chef').length;

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
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--magenta)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Assigner un travailleur</div>
          {service && (
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em' }}>
              {service.flight} · {service.time} <span style={{ fontWeight: 500, color: 'var(--muted)' }}>· {service.client}</span>
            </div>
          )}

          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un travailleur ou chef…"
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
          {stillLoading && (
            <div style={{ padding: '40px 8px', textAlign: 'center' }}>
              <div className="spinner-magenta" style={{ margin: '0 auto 14px' }}/>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Chargement de l'équipe…
              </div>
            </div>
          )}
          {!stillLoading && filtered.length === 0 && (
            <div style={{ padding: '32px 8px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              Aucun résultat.
            </div>
          )}
          {filtered.map((p, i) => {
            const isChef = p.role === 'chef';
            // Section divider before the first porter (after all chefs).
            const showDivider = i === chefCount && chefCount > 0 && !q;
            return (
              <React.Fragment key={p.id}>
                {showDivider && (
                  <div style={{
                    margin: '14px 4px 8px', fontSize: 10, fontWeight: 700,
                    color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase',
                  }}>
                    Travailleurs ({filtered.length - chefCount})
                  </div>
                )}
                {i === 0 && chefCount > 0 && !q && (
                  <div style={{
                    margin: '4px 4px 8px', fontSize: 10, fontWeight: 700,
                    color: 'var(--magenta)', letterSpacing: '.1em', textTransform: 'uppercase',
                  }}>
                    Chefs d'équipe ({chefCount})
                  </div>
                )}
                <button onClick={() => onAssign(p.id)} className="tappable" style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px', marginBottom: 8,
                  border: isChef ? '1px solid #fbd0e2' : '1px solid #ececf1',
                  borderRadius: 14,
                  background: isChef
                    ? 'linear-gradient(135deg, #fff5fa 0%, #fde6f0 100%)'
                    : '#fff',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.7)',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 999,
                    background: AVATAR_GRADIENTS[hashIdx(p.id, AVATAR_GRADIENTS.length)],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, color: 'var(--magenta)', fontSize: 14, flexShrink: 0,
                    border: isChef ? '1.5px solid var(--magenta)' : 'none',
                  }}>{p.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: 'var(--ink)',
                      letterSpacing: '-.005em',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {p.firstName} {p.lastName}
                      {isChef && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, color: '#fff',
                          background: 'var(--magenta)',
                          padding: '2px 6px', borderRadius: 5, letterSpacing: '.04em',
                        }}>CHEF</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {isChef ? "Chef d'équipe · GVA" : 'Travailleur · GVA'}
                    </div>
                  </div>
                  <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink: 0, color: '#cfcfdc' }}>
                    <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </React.Fragment>
            );
          })}
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
