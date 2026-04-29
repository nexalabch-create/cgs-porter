import React from 'react';
import { Icon } from '../components/Icons.jsx';
import { NotificationBell } from '../components/NotificationsSheet.jsx';

export function StatusPill({ status }) {
  const map = {
    todo:   { label: 'À FAIRE',  bg: '#f1f1f5', fg: '#525266', dot: '#9b9bab' },
    active: { label: 'EN COURS', bg: '#e8f8f1', fg: '#047857', dot: '#10b981' },
    done:   { label: 'TERMINÉ',  bg: '#eaeaf3', fg: '#1a1a5e', dot: '#1a1a5e' },
  };
  const s = map[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: s.bg, color: s.fg, fontSize: 10.5, fontWeight: 700,
      letterSpacing: '.08em', padding: '5px 9px 5px 8px', borderRadius: 999,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot }}/>
      {s.label}
    </span>
  );
}

function ServiceCard({ s, onOpen, index = 0, mine = false, assignedName = null, assignedInitials = null }) {
  // Three visual states for the worker:
  //   · mine          → magenta left bar + "VOUS" magenta pill
  //   · unassigned    → red left bar + "À PRENDRE" red pill (anyone can take it)
  //   · others        → muted gray bar + chip with the teammate's initials/name
  const unassigned = !s.assignedPorterId;
  const barColor = mine ? 'var(--magenta)' : (unassigned ? 'var(--red)' : '#c5c5d0');

  return (
    <div onClick={onOpen} className="tappable stagger-in" style={{
      ['--stagger']: index,
      position: 'relative', background: '#fff',
      borderRadius: 14, padding: '11px 12px 11px 16px',
      border: '1px solid ' + (mine ? '#fce0ee' : '#ececf1'),
      boxShadow: '0 1px 2px rgba(15,15,40,.04)',
      cursor: 'pointer', overflow: 'hidden',
      flexShrink: 0,  // prevent flex-column parent from squashing cards
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: barColor }}/>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{
            fontSize: 17, fontWeight: 800, color: 'var(--ink)',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em',
            whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
            maxWidth: '50%',
          }}>{s.flight}</span>
          <span style={{ fontSize: 12, color: '#c5c5d0' }}>·</span>
          <span style={{
            fontSize: 17, fontWeight: 700, color: 'var(--ink)',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>{s.time}</span>
          {mine && (
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'var(--magenta)', color: '#fff',
              fontSize: 9.5, fontWeight: 800, letterSpacing: '.10em',
              padding: '3px 7px', borderRadius: 999, flexShrink: 0,
            }}>VOUS</span>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>
          {unassigned ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fee2e2', color: '#b91c1c',
              fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em',
              padding: '5px 9px 5px 8px', borderRadius: 999,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#dc2626' }}/>
              À PRENDRE
            </span>
          ) : (
            <StatusPill status={s.status}/>
          )}
        </div>
      </div>

      <div style={{
        marginTop: 4, fontSize: 13, fontWeight: 500, color: 'var(--muted)',
        letterSpacing: '-.005em',
        whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
      }}>
        {s.client}
      </div>

      {/* "Pris par <Prénom>" chip — only on teammates' cards. Lets the
          worker see at a glance who's covering each unassigned-but-claimed
          slot without opening the detail screen. */}
      {!mine && !unassigned && assignedName && (
        <div style={{
          marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#f6f6fa', border: '1px solid #ececf1',
          padding: '3px 8px 3px 3px', borderRadius: 999,
          fontSize: 11, fontWeight: 600, color: 'var(--ink)',
          maxWidth: '100%',
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: 999,
            background: 'linear-gradient(135deg, #fce0ee, #fcb6da)',
            color: 'var(--magenta)', fontSize: 9, fontWeight: 800,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>{assignedInitials || '·'}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Pris par {assignedName}
          </span>
        </div>
      )}

      <div style={{
        marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, minWidth: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'var(--muted)', fontSize: 12, minWidth: 0,
        }}>
          <Icon.Pin size={12} color={mine ? 'var(--magenta)' : '#9b9bab'}/>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.meeting}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#f6f6fa', color: 'var(--ink)', fontSize: 11, fontWeight: 600,
            padding: '3px 7px', borderRadius: 7,
          }}>
            <Icon.Bag size={11}/> {s.bags}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            background: mine ? 'var(--magenta)' : 'var(--navy)',
            color: '#fff', fontSize: 11, fontWeight: 700,
            padding: '3px 7px', borderRadius: 7, fontVariantNumeric: 'tabular-nums',
          }}>
            {s.price} CHF
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      marginTop: 24, padding: '48px 24px', textAlign: 'center',
      background: '#fff', border: '1px dashed #e0e0ea', borderRadius: 16,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 64, height: 64, borderRadius: 999, background: '#f6f6fa', color: '#9b9bab', marginBottom: 14,
      }}>
        <Icon.Inbox size={30}/>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Aucun service prévu</div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
        Aucun service prévu pour votre prochain shift.
      </div>
    </div>
  );
}

// SectionHeader — small uppercase label between two groups of cards.
function SectionHeader({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, letterSpacing: '.12em',
      color: 'var(--muted)', textTransform: 'uppercase',
      padding: '4px 4px 0',
    }}>
      {children}
    </div>
  );
}

export default function ServicesScreen({
  services, onOpen, firstName = 'Marc', empty = false,
  currentUserId, unreadCount = 0, onOpenNotifications,
  findPorter,
}) {
  // Tiny helper that resolves an assigned porter id → { name, initials }
  // for the "Pris par X" chip on teammates' cards. Falls back to "—" / null
  // if the resolver isn't wired (demo mode, RLS hiccup, etc.).
  const resolveAssignee = React.useCallback((id) => {
    if (!id || !findPorter) return null;
    const p = findPorter(id);
    if (!p) return null;
    const first = p.firstName || p.first_name || '';
    const last  = p.lastName  || p.last_name  || '';
    const initials = p.initials || ((first[0] || '') + (last[0] || '')).toUpperCase();
    const name = first ? `${first}${last ? ' ' + last.charAt(0) + '.' : ''}` : (p.email || '');
    return { name, initials };
  }, [findPorter]);

  // Real "now" — was hardcoded to 2026-04-25 during dev. Tracks the actual day.
  const today = new Date();
  const dateLabel = today.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });
  const count = services.length;
  const counts = services.reduce((a, s) => (a[s.status] = (a[s.status] || 0) + 1, a), {});

  // When the worker has a currentUserId, partition the list into 3 groups
  // so they can scan their own first, then unassigned ones they could grab,
  // then the rest of the team's day. Keeps the "VOUS" cards above the fold.
  const partitioned = React.useMemo(() => {
    if (!currentUserId) return null;
    const mine = [];
    const open = [];
    const others = [];
    for (const s of services) {
      if (s.assignedPorterId === currentUserId) mine.push(s);
      else if (!s.assignedPorterId) open.push(s);
      else others.push(s);
    }
    return { mine, open, others };
  }, [services, currentUserId]);

  return (
    <div className="fade-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f7f7fb', minHeight: 0 }}>
      <div style={{
        background: '#fff',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 18px',
        borderBottom: '1px solid #ececf1',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
              Bonjour, {firstName}
            </div>
            <div style={{ marginTop: 2, fontSize: 13, color: 'var(--muted)', textTransform: 'capitalize' }}>
              {dateLabel}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onOpenNotifications && (
              <NotificationBell count={unreadCount} onClick={onOpenNotifications}/>
            )}
            <div style={{
              width: 40, height: 40, borderRadius: 999, background: 'linear-gradient(135deg, #fce0ee, #fcb6da)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: 'var(--magenta)', fontSize: 14, border: '1.5px solid #fff',
              boxShadow: '0 1px 2px rgba(0,0,0,.06)',
            }}>{firstName.slice(0, 1).toUpperCase()}</div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="display" style={{ fontSize: 34, fontWeight: 700, color: 'var(--magenta)', fontVariantNumeric: 'tabular-nums' }}>
            {empty ? 0 : count}
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

        {!empty && (
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { k: 'todo',   label: 'À faire',  color: '#525266',     bg: '#f1f1f5' },
              { k: 'active', label: 'En cours', color: '#047857',     bg: '#e8f8f1' },
              { k: 'done',   label: 'Terminé',  color: 'var(--navy)', bg: '#eaeaf3' },
            ].map(s => (
              <div key={s.k} style={{ background: s.bg, borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>{counts[s.k] || 0}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: s.color, opacity: .8, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {empty ? (
          <EmptyState/>
        ) : partitioned ? (
          <>
            {partitioned.mine.length > 0 && (
              <>
                <SectionHeader>Mes services ({partitioned.mine.length})</SectionHeader>
                {partitioned.mine.map((s, i) => (
                  <ServiceCard key={s.id} s={s} index={i} mine onOpen={() => onOpen(s.id)}/>
                ))}
              </>
            )}
            {partitioned.open.length > 0 && (
              <>
                <SectionHeader>À prendre ({partitioned.open.length})</SectionHeader>
                {partitioned.open.map((s, i) => (
                  <ServiceCard key={s.id} s={s} index={i} onOpen={() => onOpen(s.id)}/>
                ))}
              </>
            )}
            {partitioned.others.length > 0 && (
              <>
                <SectionHeader>Reste de l’équipe ({partitioned.others.length})</SectionHeader>
                {partitioned.others.map((s, i) => {
                  const a = resolveAssignee(s.assignedPorterId);
                  return (
                    <ServiceCard
                      key={s.id} s={s} index={i}
                      assignedName={a?.name}
                      assignedInitials={a?.initials}
                      onOpen={() => onOpen(s.id)}
                    />
                  );
                })}
              </>
            )}
          </>
        ) : (
          services.map((s, i) => (
            <ServiceCard key={s.id} s={s} index={i} onOpen={() => onOpen(s.id)}/>
          ))
        )}
      </div>
    </div>
  );
}
