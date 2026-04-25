import React from 'react';

/**
 * Lightweight toast — single message at a time, auto-hides after 3.5s.
 * Renders nothing when `message` is null. Slides up from the bottom of
 * the safe area, above the bottom-tab bar on mobile.
 *
 * Visual language matches the rest of the chef home: magenta accent,
 * inset white edge, soft shadow.
 */
export default function Toast({ message, onDismiss }) {
  React.useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => onDismiss(), 3500);
    return () => clearTimeout(id);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', left: 0, right: 0,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)',  // above the tab bar
        zIndex: 50,
        display: 'flex', justifyContent: 'center',
        padding: '0 16px',
        pointerEvents: 'none',
        animation: 'toastUp .25s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <div style={{
        pointerEvents: 'auto',
        background: 'linear-gradient(135deg, #1a1a5e 0%, #2a2a7a 100%)',
        color: '#fff',
        borderRadius: 14,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 14, fontWeight: 600,
        letterSpacing: '-.005em',
        maxWidth: 360, width: '100%',
        boxShadow: '0 16px 40px -10px rgba(15,15,40,.45), inset 0 1px 0 rgba(255,255,255,.15)',
        cursor: 'pointer',
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: 999,
          background: 'var(--magenta)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, flexShrink: 0,
          boxShadow: '0 0 12px rgba(233,30,140,.5)',
        }}>✓</span>
        <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
      </div>
    </div>
  );
}
