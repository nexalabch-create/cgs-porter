import React from 'react';

/**
 * Toast — auto-hides after a configurable delay. Two variants:
 *   · standard: inline confirmation ("Service assigné à …"). Magenta dot,
 *     navy background, single line, ~3.5 s.
 *   · urgent: incoming notification ("Nouveau service assigné" pour un porteur).
 *     Magenta gradient background, two lines (title + subtitle), 6 s, larger
 *     emoji, harder to miss.
 *
 * `message` may be a string (treated as standard) or an object:
 *   { title, subtitle?, variant?, duration? }
 *
 * Tap anywhere on the toast to dismiss.
 */
const DEFAULT_DURATIONS = { standard: 3500, urgent: 6500 };

export default function Toast({ message, onDismiss }) {
  // Normalize string → object form.
  const m = React.useMemo(() => {
    if (!message) return null;
    if (typeof message === 'string') return { title: message, variant: 'standard' };
    return { variant: 'standard', ...message };
  }, [message]);

  React.useEffect(() => {
    if (!m) return;
    const ms = m.duration ?? DEFAULT_DURATIONS[m.variant] ?? DEFAULT_DURATIONS.standard;
    const id = setTimeout(() => onDismiss(), ms);
    return () => clearTimeout(id);
  }, [m, onDismiss]);

  if (!m) return null;

  const isUrgent = m.variant === 'urgent';

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', left: 0, right: 0,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)',
        zIndex: 50,
        display: 'flex', justifyContent: 'center',
        padding: '0 16px',
        pointerEvents: 'none',
        animation: 'toastUp .25s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <div style={{
        pointerEvents: 'auto',
        background: isUrgent
          ? 'linear-gradient(135deg, #f23ba0 0%, #c2127a 100%)'
          : 'linear-gradient(135deg, #1a1a5e 0%, #2a2a7a 100%)',
        color: '#fff',
        borderRadius: isUrgent ? 18 : 14,
        padding: isUrgent ? '14px 18px' : '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: 'inherit',
        fontSize: 14, fontWeight: 600,
        letterSpacing: '-.005em',
        maxWidth: 380, width: '100%',
        boxShadow: isUrgent
          ? '0 22px 50px -12px rgba(233,30,140,.55), 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.25)'
          : '0 16px 40px -10px rgba(15,15,40,.45), inset 0 1px 0 rgba(255,255,255,.15)',
        cursor: 'pointer',
        animation: isUrgent ? 'toastPulse 1.1s ease-in-out 2' : undefined,
      }}>
        <span style={{
          width: isUrgent ? 30 : 22,
          height: isUrgent ? 30 : 22,
          borderRadius: 999,
          background: isUrgent ? '#fff' : 'var(--magenta)',
          color: isUrgent ? 'var(--magenta)' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isUrgent ? 16 : 12, fontWeight: 800, flexShrink: 0,
          boxShadow: isUrgent ? '0 0 16px rgba(255,255,255,.55)' : '0 0 12px rgba(233,30,140,.5)',
        }}>{isUrgent ? '🔔' : '✓'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: isUrgent ? 15 : 14,
            fontWeight: isUrgent ? 800 : 600,
            letterSpacing: '-.01em',
            lineHeight: 1.25,
          }}>
            {m.title}
          </div>
          {m.subtitle ? (
            <div style={{
              marginTop: 3, fontSize: 12.5, fontWeight: 500,
              color: isUrgent ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.75)',
              letterSpacing: '-.005em', lineHeight: 1.3,
            }}>
              {m.subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
