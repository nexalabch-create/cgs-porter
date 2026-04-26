import React from 'react';
import { Icon } from '../components/Icons.jsx';
import { NotificationBell } from '../components/NotificationsSheet.jsx';

// Parse "HH:MM" or "HH:MM:SS" into minutes-since-midnight.
function hmToMin(s) {
  if (!s) return null;
  const [h, m] = String(s).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Hash a string into one of N indices — used for varied avatar gradients.
function hashIdx(s, n) {
  if (!s) return 0;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % n;
}

// Premium-feeling avatar gradients — wider saturation than the old single
// pale-pink. Cycled by user-id hash so adjacent rows look distinct.
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #fcecf4 0%, #f8a8d4 100%)',
  'linear-gradient(135deg, #f5e6f8 0%, #d896e8 100%)',
  'linear-gradient(135deg, #fef0f5 0%, #f7b3c9 100%)',
  'linear-gradient(135deg, #f9e6ed 0%, #e89bbf 100%)',
];
const avatarBg = (id, isMe) =>
  isMe ? 'var(--magenta)' : AVATAR_GRADIENTS[hashIdx(id || '', AVATAR_GRADIENTS.length)];

// One stat tile — shared between header stats and Activité widget so the
// visual rhythm is consistent. iOS Health-style: big tabular number, tiny
// uppercase tracked label.
function StatTile({ value, label, color = 'var(--ink)', tone = 'neutral' }) {
  // tone="warm" applies a subtle tinted background for "alert" states.
  const bg = tone === 'warm'  ? 'linear-gradient(135deg, rgba(233,30,140,.05), rgba(255,255,255,0))'
           : tone === 'good'  ? 'linear-gradient(135deg, rgba(16,185,129,.05), rgba(255,255,255,0))'
           : '#fafafd';
  return (
    <div style={{
      background: bg, border: '1px solid #ececf1', borderRadius: 14,
      padding: '14px 12px', textAlign: 'center',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.7), 0 1px 2px rgba(15,15,40,.03)',
    }}>
      <div style={{
        fontSize: 32, fontWeight: 800, color, letterSpacing: '-.03em',
        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>{value}</div>
      <div style={{
        marginTop: 6, fontSize: 10, fontWeight: 700, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '.1em',
      }}>{label}</div>
    </div>
  );
}

// Section header — small uppercase muted label, used across all cards
// for unity. The accent prop optionally tints it magenta for actionable
// sections like "Services à assigner".
function SectionLabel({ children, accent, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{
        fontSize: 10, fontWeight: 700,
        color: accent ? 'var(--magenta)' : 'var(--muted)',
        letterSpacing: '.12em', textTransform: 'uppercase',
      }}>{children}</div>
      {right}
    </div>
  );
}

export default function ChefHomeScreen({
  user, services, shift, stats, team = [],
  unreadCount = 0, onOpenNotifications,
  onAssignNext, onOpenPlanning,
}) {
  // Real "now" — was hardcoded to 2026-04-25 during dev. The date label
  // tracks the actual day so the demo doesn't say "Samedi 25 Avril" when
  // run on May 1.
  const today = new Date();
  const dateLabel = today.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });

  const unassigned = services.filter(s => !s.assignedPorterId);
  const next = unassigned[0] || null;

  // Live tick — keeps the "actifs maintenant" predicate fresh without waiting
  // on a Supabase realtime event. Data itself is realtime-pushed.
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
    <div className="fade-enter" style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: '#f7f7fb', minHeight: 0,
    }}>
      {/* ── HERO HEADER ─────────────────────────────────────────── */}
      <div style={{
        background: `
          radial-gradient(ellipse 80% 60% at 100% 0%, rgba(233,30,140,.04), transparent 60%),
          #fff
        `,
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 18px',
        borderBottom: '1px solid #ececf1',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <div className="display" style={{
              fontSize: 24, fontWeight: 700, letterSpacing: '-.025em',
              color: 'var(--ink)', whiteSpace: 'nowrap',
            }}>
              Bonjour {user.firstName}&nbsp;<span style={{ display: 'inline-block', transform: 'translateY(-1px)' }}>👋</span>
            </div>
            <div style={{ marginTop: 3, fontSize: 13, color: 'var(--muted)', textTransform: 'capitalize' }}>
              {dateLabel} · <span style={{ color: 'var(--navy)', fontWeight: 700 }}>Chef d'équipe</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotificationBell count={unreadCount} onClick={onOpenNotifications}/>
            <div style={{
              width: 44, height: 44, borderRadius: 999,
              background: 'var(--magenta)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, color: '#fff', fontSize: 14,
              border: '2px solid #fff',
              boxShadow: '0 0 24px rgba(233, 30, 140, .22), 0 1px 3px rgba(0,0,0,.08)',
            }}>{user.initials}</div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <StatTile
            value={stats.total}
            label="services"
            color="var(--ink)"
          />
          <StatTile
            value={stats.unassigned}
            label="non assignés"
            color={stats.unassigned > 0 ? 'var(--red)' : 'var(--ink)'}
            tone={stats.unassigned > 0 ? 'warm' : 'neutral'}
          />
          <StatTile
            value={stats.done}
            label="terminés"
            color="var(--navy)"
          />
        </div>
      </div>

      <div className="scroll" style={{
        flex: 1, overflowY: 'auto',
        padding: '14px 16px 24px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {/* ── SERVICES À ASSIGNER ────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 18,
          border: '1px solid #ececf1', borderTop: '4px solid var(--magenta)',
          padding: '16px 18px',
          boxShadow: '0 1px 2px rgba(15,15,40,.04), inset 0 1px 0 rgba(255,255,255,.7)',
        }}>
          <SectionLabel accent right={
            <span style={{
              minWidth: 24, height: 22, padding: '0 8px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: stats.unassigned > 0 ? 'var(--red)' : '#cfcfdc', color: '#fff',
              fontSize: 12, fontWeight: 800, borderRadius: 999,
              fontVariantNumeric: 'tabular-nums',
            }}>{stats.unassigned}</span>
          }>
            Services à assigner
          </SectionLabel>

          {next && next.flight ? (
            <>
              <div style={{
                marginTop: 12, padding: '14px 16px', borderRadius: 14,
                background: 'linear-gradient(135deg, #fff5fa 0%, #fde6f0 100%)',
                border: '1px solid #fbd0e2',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.7)',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span className="display" style={{
                    fontSize: 30, fontWeight: 700, color: 'var(--ink)',
                    letterSpacing: '-.025em', fontVariantNumeric: 'tabular-nums',
                  }}>{next.flight}</span>
                  <span style={{ fontSize: 16, fontWeight: 500, color: '#cfcfdc' }}>·</span>
                  <span className="display" style={{
                    fontSize: 30, fontWeight: 700, color: 'var(--ink)',
                    letterSpacing: '-.025em', fontVariantNumeric: 'tabular-nums',
                  }}>{next.time}</span>
                </div>
                <div style={{
                  marginTop: 6, fontSize: 15, fontWeight: 700,
                  color: 'var(--ink)', letterSpacing: '-.01em',
                }}>
                  {next.client || '—'}
                </div>
                <div style={{
                  marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
                  color: 'var(--muted)', fontSize: 12.5,
                }}>
                  <Icon.Pin size={14} color="var(--magenta)"/>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {next.meeting || 'Lieu à confirmer'}
                  </span>
                </div>
              </div>

              <button onClick={onAssignNext} className="tappable" style={{
                marginTop: 14, width: '100%', height: 50, border: 0, borderRadius: 14,
                background: 'linear-gradient(135deg, #f23ba0 0%, #c2127a 100%)',
                color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5,
                letterSpacing: '-.005em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 10px 24px -10px rgba(233,30,140,.65), inset 0 1px 0 rgba(255,255,255,.25)',
                transition: 'transform .15s ease, box-shadow .2s ease',
              }}>
                Assigner un porteur <Icon.ChevronRight size={16}/>
              </button>
            </>
          ) : stats.unassigned === 0 ? (
            <div style={{
              marginTop: 14, padding: '14px 16px', borderRadius: 14,
              background: 'linear-gradient(135deg, #e8f8f1 0%, #d4f1e3 100%)',
              border: '1px solid #b9ecd2',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: 999, background: 'var(--green)',
                boxShadow: '0 0 8px rgba(16,185,129,.5)',
              }}/>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#047857' }}>
                Tous les services sont assignés. ✨
              </div>
            </div>
          ) : (
            // Defensive fallback — count > 0 but next has no flight (data still loading or malformed)
            <div style={{
              marginTop: 14, padding: '14px', borderRadius: 14,
              background: '#fafafd', border: '1px dashed #e0e0ea',
              fontSize: 13, color: 'var(--muted)', textAlign: 'center',
            }}>
              {stats.unassigned} service{stats.unassigned > 1 ? 's' : ''} en attente — synchronisation en cours…
            </div>
          )}
        </div>

        {/* ── ACTIVITÉ DE L'ÉQUIPE ───────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 18, border: '1px solid #ececf1',
          padding: '16px 18px',
          boxShadow: '0 1px 2px rgba(15,15,40,.04), inset 0 1px 0 rgba(255,255,255,.7)',
        }}>
          <SectionLabel right={
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10, fontWeight: 700, color: 'var(--magenta)',
              letterSpacing: '.08em', textTransform: 'uppercase',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: 999, background: 'var(--magenta)',
                animation: 'pulse 1.6s ease-in-out infinite',
                boxShadow: '0 0 8px rgba(233,30,140,.5)',
              }}/>
              en direct
            </div>
          }>
            Activité de l'équipe
          </SectionLabel>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <StatTile value={activeUsers.length}        label="actifs"   color="var(--magenta)" tone="warm" />
            <StatTile value={stats.active ?? 0}          label="en cours" color="var(--green)"   tone="good" />
            <StatTile value={stats.todo ?? stats.unassigned} label="à faire" color="var(--navy)" />
          </div>

          {activeUsers.length > 0 && (
            <>
              <div style={{
                marginTop: 16, fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '.1em',
              }}>
                En service maintenant
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {activeUsers.slice(0, 6).map((u) => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: '#fafafd', border: '1px solid #ececf1',
                    borderRadius: 999, padding: '4px 11px 4px 4px',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.7)',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 999,
                      background: avatarBg(u.id, u.id === user.id),
                      color: u.id === user.id ? '#fff' : 'var(--magenta)',
                      fontSize: 9.5, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{u.initials || (u.first_name?.[0] || '') + (u.last_name?.[0] || '')}</div>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--ink)',
                      letterSpacing: '-.005em',
                    }}>
                      {u.first_name}
                    </span>
                  </div>
                ))}
                {activeUsers.length > 6 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--magenta-soft)', color: 'var(--magenta)',
                    borderRadius: 999, padding: '4px 11px',
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
              marginTop: 14, padding: '11px 12px', borderRadius: 12,
              background: '#fafafd', border: '1px dashed #e0e0ea',
              fontSize: 12, color: 'var(--muted)', textAlign: 'center',
            }}>
              Personne en service à cette heure.
            </div>
          )}
        </div>

        {/* ── VOTRE SHIFT ────────────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 18, border: '1px solid #ececf1',
          padding: '16px 18px',
          boxShadow: '0 1px 2px rgba(15,15,40,.04), inset 0 1px 0 rgba(255,255,255,.7)',
        }}>
          <SectionLabel right={
            <span style={{
              fontSize: 11, fontWeight: 800, color: 'var(--navy)',
              background: '#eaeaf3', padding: '4px 9px',
              borderRadius: 6, letterSpacing: '.06em',
              fontFeatureSettings: '"tnum"',
            }}>{shift.code}</span>
          }>
            Votre shift aujourd'hui
          </SectionLabel>

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '.08em',
              }}>Début</div>
              <div className="display" style={{
                marginTop: 4, fontSize: 28, fontWeight: 700,
                color: 'var(--ink)', letterSpacing: '-.025em',
                fontVariantNumeric: 'tabular-nums',
              }}>{shift.start}</div>
            </div>
            <div style={{ width: 32, color: '#cfcfdc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="10" viewBox="0 0 28 10" fill="none">
                <path d="M0 5h26M22 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '.08em',
              }}>Fin</div>
              <div className="display" style={{
                marginTop: 4, fontSize: 28, fontWeight: 700,
                color: 'var(--ink)', letterSpacing: '-.025em',
                fontVariantNumeric: 'tabular-nums',
              }}>{shift.end}</div>
            </div>
          </div>
          {shift.pause > 0 && (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 12,
              background: '#fafafd', border: '1px solid #ececf1',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                <Icon.Clock size={14}/> Pause
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                {shift.pause} min
              </div>
            </div>
          )}
        </div>

        {/* ── MON ÉQUIPE AUJOURD'HUI ─────────────────────────────── */}
        {team.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 18, border: '1px solid #ececf1',
            padding: '16px 18px 6px',
            boxShadow: '0 1px 2px rgba(15,15,40,.04), inset 0 1px 0 rgba(255,255,255,.7)',
          }}>
            <SectionLabel right={
              <span style={{
                background: 'var(--magenta-soft)', color: 'var(--magenta)',
                fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {team.length} {team.length === 1 ? 'personne' : 'personnes'}
              </span>
            }>
              Mon équipe aujourd'hui
            </SectionLabel>

            <div style={{ marginTop: 4 }}>
              {team.map((row, i) => {
                const isMe = row.user_id === user.id;
                const u = row.user;
                return (
                  <div key={row.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid #f1f1f5',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 999,
                      background: avatarBg(u?.id || row.user_id, isMe),
                      color: isMe ? '#fff' : 'var(--magenta)',
                      fontSize: 12, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      boxShadow: isMe ? '0 0 16px rgba(233,30,140,.18)' : 'inset 0 1px 0 rgba(255,255,255,.5)',
                    }}>{u?.initials || '??'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700, color: 'var(--ink)',
                        letterSpacing: '-.005em',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {u ? `${u.first_name} ${u.last_name}` : '— inconnu —'}
                        {isMe && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, color: '#fff', background: 'var(--magenta)',
                            padding: '2px 6px', borderRadius: 5, letterSpacing: '.04em',
                          }}>VOUS</span>
                        )}
                      </div>
                      <div style={{
                        marginTop: 2, display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums',
                      }}>
                        <span style={{
                          background: '#eaeaf3', color: 'var(--navy)', fontWeight: 800,
                          padding: '2px 6px', borderRadius: 4, letterSpacing: '.04em',
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
          </div>
        )}

        {/* ── QUICK ACTIONS ──────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={onOpenPlanning} className="tappable" style={{
            background: '#fff', border: '1px solid #ececf1', borderRadius: 16,
            padding: '14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', gap: 8,
            boxShadow: '0 1px 2px rgba(15,15,40,.04), inset 0 1px 0 rgba(255,255,255,.7)',
            transition: 'transform .15s ease, box-shadow .2s ease',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 11,
              background: 'linear-gradient(135deg, #fcecf4 0%, #fad4e6 100%)',
              color: 'var(--magenta)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.7)',
            }}>
              <Icon.Calendar size={16}/>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Planning</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Voir mon mois</div>
          </button>
          <button className="tappable" style={{
            background: '#fff', border: '1px solid #ececf1', borderRadius: 16,
            padding: '14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', gap: 8,
            boxShadow: '0 1px 2px rgba(15,15,40,.04), inset 0 1px 0 rgba(255,255,255,.7)',
            transition: 'transform .15s ease, box-shadow .2s ease',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 11,
              background: 'linear-gradient(135deg, #eaeaf3 0%, #d4d4e6 100%)',
              color: 'var(--navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.7)',
            }}>
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
