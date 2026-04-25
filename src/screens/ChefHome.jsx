import React from 'react';
import { Icon } from '../components/Icons.jsx';

// Parse "HH:MM" or "HH:MM:SS" into minutes-since-midnight.
function hmToMin(s) {
  if (!s) return null;
  const [h, m] = String(s).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export default function ChefHomeScreen({
  user, services, shift, stats, team = [],
  onAssignNext, onOpenPlanning,
}) {
  const today = new Date(2026, 3, 25);
  const dateLabel = today.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });

  const unassigned = services.filter(s => !s.assignedPorterId);
  const next = unassigned[0] || null;

  // Live "active now" computation — ticks every minute so the filter stays
  // accurate even without new data events. Supabase realtime handles the
  // data-update path; this tick only keeps the time-based predicate fresh.
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const activeTeam = team.filter(row => {
    const s = hmToMin(row.starts_at);
    const e = hmToMin(row.ends_at);
    if (s == null || e == null) return false;
    return nowMin >= s && nowMin <= e;
  });
  const activeUsers = activeTeam.map(r => r.user).filter(Boolean);

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
              Bonjour {user.firstName}&nbsp;<span style={{ display: 'inline-block', transform: 'translateY(-1px)' }}>👋</span>
            </div>
            <div style={{ marginTop: 2, fontSize: 13, color: 'var(--muted)', textTransform: 'capitalize' }}>
              {dateLabel} · <span style={{ color: 'var(--navy)', fontWeight: 700 }}>Chef d'équipe</span>
            </div>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 999, background: 'linear-gradient(135deg, #fce0ee, #fcb6da)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, color: 'var(--magenta)', fontSize: 14, border: '1.5px solid #fff',
            boxShadow: '0 1px 2px rgba(0,0,0,.06)',
          }}>{user.initials}</div>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { v: stats.total,      label: 'services',     color: 'var(--ink)' },
            { v: stats.unassigned, label: 'non assignés', color: stats.unassigned > 0 ? 'var(--red)' : 'var(--ink)' },
            { v: stats.done,       label: 'terminés',     color: 'var(--navy)' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#fafafd', border: '1px solid #ececf1',
              borderRadius: 12, padding: '10px 10px',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.color, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--magenta)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
              Services à assigner
            </div>
            <span style={{
              minWidth: 24, height: 22, padding: '0 8px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: stats.unassigned > 0 ? 'var(--red)' : '#cfcfdc', color: '#fff',
              fontSize: 12, fontWeight: 800, borderRadius: 999, letterSpacing: '-.005em',
              fontVariantNumeric: 'tabular-nums',
            }}>{stats.unassigned}</span>
          </div>

          {next ? (
            <>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{next.flight}</span>
                <span style={{ fontSize: 16, fontWeight: 500, color: '#9b9bab' }}>·</span>
                <span className="display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{next.time}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em' }}>
                {next.client}
              </div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13 }}>
                <Icon.Pin size={14} color="var(--magenta)"/> {next.meeting}
              </div>

              <button onClick={onAssignNext} className="tappable" style={{
                marginTop: 14, width: '100%', height: 46, border: 0, borderRadius: 12,
                background: 'var(--magenta)', color: '#fff',
                fontFamily: 'inherit', fontWeight: 700, fontSize: 14, letterSpacing: '-.005em',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 18px -8px rgba(233,30,140,.55)',
              }}>
                Assigner un porteur <Icon.ChevronRight size={16}/>
              </button>
            </>
          ) : (
            <div style={{
              marginTop: 14, padding: '14px',
              background: '#e8f8f1', border: '1px solid #b9ecd2', borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--green)' }}/>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#047857' }}>
                Tous les services sont assignés.
              </div>
            </div>
          )}
        </div>

        {/* Activité de l'équipe — live stats + active porters right now.
            Ticks every minute so "actifs maintenant" stays accurate. */}
        <div style={{
          background: '#fff', borderRadius: 18, border: '1px solid #ececf1',
          padding: '16px 18px', boxShadow: '0 1px 2px rgba(15,15,40,.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
              Activité de l'équipe
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: 'var(--magenta)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
              <span style={{
                width: 7, height: 7, borderRadius: 999, background: 'var(--magenta)',
                animation: 'pulse 1.6s ease-in-out infinite',
              }}/>
              en direct
            </div>
          </div>

          {/* Stat row: actifs / en cours / à faire */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { v: activeUsers.length,            label: 'actifs',   color: 'var(--magenta)' },
              { v: stats.active ?? 0,             label: 'en cours', color: 'var(--green)'   },
              { v: stats.todo ?? stats.unassigned, label: 'à faire',  color: 'var(--navy)'    },
            ].map((s, i) => (
              <div key={i} style={{
                background: '#fafafd', border: '1px solid #ececf1', borderRadius: 12,
                padding: '12px 10px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {s.v}
                </div>
                <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Active porters now — avatars row */}
          {activeUsers.length > 0 && (
            <>
              <div style={{
                marginTop: 14, fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '.08em',
              }}>
                En service maintenant
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {activeUsers.slice(0, 6).map((u, i) => (
                  <div key={u.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#fafafd', border: '1px solid #ececf1',
                    borderRadius: 999, padding: '4px 10px 4px 4px',
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 999,
                      background: u.id === user.id ? 'var(--magenta)' : 'linear-gradient(135deg, #fce0ee, #fcb6da)',
                      color: u.id === user.id ? '#fff' : 'var(--magenta)',
                      fontSize: 9, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{u.initials || (u.first_name?.[0] || '') + (u.last_name?.[0] || '')}</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.005em' }}>
                      {u.first_name}
                    </span>
                  </div>
                ))}
                {activeUsers.length > 6 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--magenta-soft)', color: 'var(--magenta)',
                    borderRadius: 999, padding: '4px 10px',
                    fontSize: 12, fontWeight: 800,
                  }}>
                    +{activeUsers.length - 6}
                  </div>
                )}
              </div>
            </>
          )}

          {activeUsers.length === 0 && (
            <div style={{
              marginTop: 14, padding: '10px 12px',
              background: '#fafafd', border: '1px solid #ececf1', borderRadius: 10,
              fontSize: 12, color: 'var(--muted)', textAlign: 'center',
            }}>
              Personne en service à cette heure.
            </div>
          )}
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

        {/* Mon équipe aujourd'hui — list of porters working today with their shift codes + breaks */}
        {team.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 18, border: '1px solid #ececf1',
            padding: '16px 18px 6px', boxShadow: '0 1px 2px rgba(15,15,40,.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
                Mon équipe aujourd'hui
              </div>
              <span style={{
                background: 'var(--magenta-soft)', color: 'var(--magenta)',
                fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {team.length} {team.length === 1 ? 'personne' : 'personnes'}
              </span>
            </div>
            {team.map((row, i) => {
              const isMe = row.user_id === user.id;
              const u = row.user;
              return (
                <div key={row.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid #f1f1f5',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 999,
                    background: isMe ? 'var(--magenta)' : 'linear-gradient(135deg, #fce0ee, #fcb6da)',
                    color: isMe ? '#fff' : 'var(--magenta)',
                    fontSize: 12, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{u?.initials || '??'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.005em', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {u ? `${u.first_name} ${u.last_name}` : '— inconnu —'}
                      {isMe && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, color: '#fff', background: 'var(--magenta)',
                          padding: '1px 5px', borderRadius: 4, letterSpacing: '.04em',
                        }}>VOUS</span>
                      )}
                    </div>
                    <div style={{ marginTop: 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{
                        background: '#eaeaf3', color: 'var(--navy)', fontWeight: 800,
                        padding: '1px 5px', borderRadius: 4, letterSpacing: '.04em',
                      }}>{row.code}</span>
                      <span>{row.starts_at?.slice(0, 5)} → {row.ends_at?.slice(0, 5)}</span>
                      <span>·</span>
                      <span>pause {row.pause_minutes}'</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Revenus équipe</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Ce mois</div>
          </button>
        </div>
      </div>
    </div>
  );
}
