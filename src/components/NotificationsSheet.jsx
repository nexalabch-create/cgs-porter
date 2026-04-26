import React from 'react';

// Format a Date like "il y a 5 min" / "il y a 2 h" / "hier 14:30" / "lun. 14:30".
function timeAgo(d) {
  const now = new Date();
  const ms = now - d;
  const min = Math.floor(ms / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 12) return `il y a ${h} h`;
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `hier ${d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('fr-CH', { weekday: 'short', day: '2-digit', month: 'short' });
}

const TYPE_META = {
  service_assigned: {
    icon: '📋',
    label: 'Nouveau service assigné',
    color: 'var(--magenta)',
    bg: 'linear-gradient(135deg, #fff5fa 0%, #fde6f0 100%)',
    border: '#fbd0e2',
  },
  service_started: {
    icon: '▶️',
    label: 'Service démarré',
    color: 'var(--green)',
    bg: 'linear-gradient(135deg, #f0fdf6 0%, #dcfce7 100%)',
    border: '#bbf7d0',
  },
  service_completed: {
    icon: '✅',
    label: 'Service terminé',
    color: 'var(--navy)',
    bg: 'linear-gradient(135deg, #f5f5fb 0%, #e8e8f3 100%)',
    border: '#d4d4e6',
  },
};

function bodyFor(n, isChef) {
  const p = n.payload || {};
  if (n.type === 'service_assigned') {
    // recipient is the porter
    return (
      <>
        <strong>{p.flight}</strong> · {p.time} — {p.client || 'Client à confirmer'}
        {p.meeting ? <><br/><span style={{ color: 'var(--muted)' }}>📍 {p.meeting}</span></> : null}
      </>
    );
  }
  if (n.type === 'service_started') {
    return (
      <>
        Le porteur a démarré <strong>{p.flight}</strong> · {p.time}
      </>
    );
  }
  if (n.type === 'service_completed') {
    return (
      <>
        Service <strong>{p.flight}</strong> · {p.time} terminé
      </>
    );
  }
  return JSON.stringify(p);
}

export default function NotificationsSheet({ open, notifications, onClose, onMarkRead, onMarkAllRead, isChef }) {
  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(15,15,40,.4)', zIndex: 40,
        animation: 'sheetFade .2s ease',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, top: 60,
        background: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
        zIndex: 41, display: 'flex', flexDirection: 'column',
        animation: 'sheetUp .25s cubic-bezier(.2,.8,.2,1)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{ width: 44, height: 5, background: '#e0e0ea', borderRadius: 999, margin: '10px auto 12px' }}/>

        <div style={{
          padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--magenta)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
              Notifications
            </div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em' }}>
              {notifications.length === 0
                ? 'Aucune notification'
                : `${notifications.length} ${notifications.length === 1 ? 'notification' : 'notifications'}`}
            </div>
          </div>
          {notifications.some(n => !n.readAt) && (
            <button onClick={onMarkAllRead} className="tappable" style={{
              border: 0, background: 'transparent',
              color: 'var(--magenta)', fontFamily: 'inherit', fontWeight: 700,
              fontSize: 12, cursor: 'pointer', padding: '6px 8px',
            }}>
              Tout marquer lu
            </button>
          )}
        </div>

        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 16px' }}>
          {notifications.length === 0 && (
            <div style={{
              marginTop: 32, padding: '32px 24px', textAlign: 'center',
              background: '#fafafd', border: '1px dashed #e0e0ea', borderRadius: 16,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                Tout est calme
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)' }}>
                Tu seras notifié dès qu'un service est assigné ou démarré.
              </div>
            </div>
          )}

          {notifications.map((n) => {
            const meta = TYPE_META[n.type] || TYPE_META.service_assigned;
            const unread = !n.readAt;
            return (
              <button
                key={n.id}
                onClick={() => onMarkRead(n.id)}
                className="tappable"
                style={{
                  width: '100%', textAlign: 'left',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', marginBottom: 8,
                  borderRadius: 14,
                  border: `1px solid ${unread ? meta.border : '#ececf1'}`,
                  background: unread ? meta.bg : '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                  position: 'relative',
                }}
              >
                {unread && (
                  <span style={{
                    position: 'absolute', top: 12, right: 12,
                    width: 8, height: 8, borderRadius: 999, background: meta.color,
                  }}/>
                )}
                <div style={{
                  width: 36, height: 36, flexShrink: 0,
                  borderRadius: 12, background: '#fff',
                  border: `1px solid ${meta.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: meta.color,
                    letterSpacing: '.06em', textTransform: 'uppercase',
                  }}>
                    {meta.label}
                  </div>
                  <div style={{
                    marginTop: 4, fontSize: 14, color: 'var(--ink)',
                    letterSpacing: '-.005em', lineHeight: 1.4,
                  }}>
                    {bodyFor(n, isChef)}
                  </div>
                  <div style={{
                    marginTop: 6, fontSize: 11, color: 'var(--muted)', fontWeight: 600,
                  }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding: '8px 20px 16px', borderTop: '1px solid #ececf1' }}>
          <button onClick={onClose} className="tappable" style={{
            width: '100%', height: 46, border: '1.5px solid #e7e7ee', background: '#fff',
            borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
            color: 'var(--ink)', cursor: 'pointer',
          }}>
            Fermer
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// NotificationBell — tappable bell icon with unread badge.
// Drop into headers next to the avatar.
// ─────────────────────────────────────────────────────────────────
export function NotificationBell({ count = 0, onClick }) {
  return (
    <button onClick={onClick} className="tappable" aria-label="Notifications" style={{
      position: 'relative',
      width: 40, height: 40, borderRadius: 999,
      background: count > 0 ? 'var(--magenta-soft)' : '#fafafd',
      border: '1px solid ' + (count > 0 ? '#fbd0e2' : '#ececf1'),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', fontFamily: 'inherit',
      transition: 'background .15s ease',
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke={count > 0 ? 'var(--magenta)' : 'var(--ink)'}
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      </svg>
      {count > 0 && (
        <span style={{
          position: 'absolute', top: -2, right: -2,
          minWidth: 18, height: 18, padding: '0 5px',
          background: 'var(--magenta)', color: '#fff',
          fontSize: 10.5, fontWeight: 800, borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #fff',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
