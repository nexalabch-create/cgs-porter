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

function ServiceCard({ s, onOpen, index = 0 }) {
  return (
    <div onClick={onOpen} className="tappable stagger-in" style={{
      // Skill · frontend-design — staggered reveal animates each card in sequence.
      ['--stagger']: index,
      position: 'relative', background: '#fff',
      borderRadius: 16, padding: '14px 14px 14px 18px',
      border: '1px solid #ececf1',
      boxShadow: '0 1px 2px rgba(15,15,40,.04)',
      cursor: 'pointer', overflow: 'hidden',
      flexShrink: 0,  // prevent flex-column parent from squashing cards
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--magenta)' }}/>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span className="display" style={{ fontSize: 23, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
            {s.flight}
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#9b9bab' }}>·</span>
          <span className="display" style={{ fontSize: 23, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
            {s.time}
          </span>
        </div>
        <StatusPill status={s.status}/>
      </div>

      <div style={{ marginTop: 4, fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.005em' }}>
        {s.client}
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13, minWidth: 0 }}>
          <Icon.Pin size={14} color="var(--magenta)"/>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.meeting}</span>
        </div>
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

export default function ServicesScreen({
  services, onOpen, firstName = 'Marc', empty = false,
  unreadCount = 0, onOpenNotifications,
}) {
  // Real "now" — was hardcoded to 2026-04-25 during dev. Tracks the actual day.
  const today = new Date();
  const dateLabel = today.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });
  const count = services.length;
  const counts = services.reduce((a, s) => (a[s.status] = (a[s.status] || 0) + 1, a), {});

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
        {empty ? <EmptyState/> : services.map((s, i) => (
          <ServiceCard key={s.id} s={s} index={i} onOpen={() => onOpen(s.id)}/>
        ))}
        {!empty && (
          <div style={{ textAlign: 'center', fontSize: 11, color: '#aaaab8', marginTop: 6, letterSpacing: '.04em' }}>
            Fin du shift · 18:00
          </div>
        )}
      </div>
    </div>
  );
}
