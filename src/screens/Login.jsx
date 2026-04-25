import React from 'react';
import { Icon } from '../components/Icons.jsx';

// Hoisted out of render — same reference every time. (Skill · rerender-memo-with-default-value)
const ROLE_TABS = [
  { id: 'porter', label: 'Porteur' },
  { id: 'chef',   label: "Chef d\u2019équipe" },
];
const DEFAULT_EMAIL = {
  chef:   'mate.torgvaidze@cgs-ltd.com',
  porter: 'marc.dubois@cgs-ltd.com',
};

export default function LoginScreen({ onLogin }) {
  const [role, setRole] = React.useState('porter');
  // User can edit the email; track the "dirty" state separately from the role-derived default.
  // (Skill · rerender-derived-state-no-effect — avoid mirroring derivable values into state.)
  const [emailOverride, setEmailOverride] = React.useState(null);
  const email = emailOverride ?? DEFAULT_EMAIL[role];
  const [password, setPassword] = React.useState('••••••••••');
  const [showPw, setShowPw] = React.useState(false);
  const [focused, setFocused] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const submit = (e) => {
    e && e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(role); }, 700);
  };

  const fieldWrap = (name) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#fff',
    border: '1.5px solid ' + (focused === name ? 'var(--magenta)' : '#e7e7ee'),
    borderRadius: 14, padding: '14px 14px',
    transition: 'border-color .15s ease, box-shadow .15s ease',
    boxShadow: focused === name ? '0 0 0 4px rgba(233,30,140,.10)' : 'none',
  });

  return (
    <div className="fade-enter" style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 28px 28px',
      // Atmospheric magenta-tinted radial gradient — subtle depth without disrupting form legibility.
      // (Skill: frontend-design — backgrounds should create atmosphere, not default to solid colors.)
      background: `
        radial-gradient(ellipse 80% 50% at 50% 0%, rgba(233, 30, 140, 0.08), transparent 60%),
        radial-gradient(ellipse 60% 40% at 50% 100%, rgba(26, 26, 94, 0.04), transparent 70%),
        #fff
      `,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36 }}>
        <img src="/logo-cgs.png" alt="CGS" style={{ height: 88, width: 'auto', objectFit: 'contain' }}/>
      </div>

      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '.18em',
          color: 'var(--magenta)', textTransform: 'uppercase', marginBottom: 8,
        }}>Geneva Airport · GVA</div>
        <h1 className="display" style={{
          margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-.035em',
          color: 'var(--navy)', lineHeight: 1.05,
        }}>Porter Service GVA</h1>
        <p style={{
          margin: '10px 0 0', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5,
        }}>Connectez-vous pour accéder à vos services du jour.</p>
      </div>

      <div style={{
        marginTop: 24, display: 'flex', gap: 4, padding: 4,
        background: '#f6f6fa', borderRadius: 12,
      }}>
        {ROLE_TABS.map(r => {
          const a = role === r.id;
          return (
            <button key={r.id} type="button" onClick={() => setRole(r.id)} className="tappable" style={{
              flex: 1, height: 36, border: 0, borderRadius: 9,
              background: a ? '#fff' : 'transparent',
              color: a ? 'var(--magenta)' : 'var(--muted)',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 13, letterSpacing: '-.005em',
              cursor: 'pointer',
              boxShadow: a ? '0 1px 3px rgba(15,15,40,.08)' : 'none',
            }}>{r.label}</button>
          );
        })}
      </div>

      <form onSubmit={submit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.005em' }}>E-mail</span>
          <div style={fieldWrap('email')}>
            <Icon.Mail color="#9b9bab"/>
            <input
              type="email" value={email}
              onChange={(e) => setEmailOverride(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              placeholder="prenom.nom@cgs-ltd.com"
              autoComplete="email"
              style={{
                flex: 1, border: 0, outline: 'none', background: 'transparent',
                fontFamily: 'inherit', fontSize: 15, color: 'var(--ink)', minWidth: 0,
              }}
            />
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Mot de passe</span>
          <div style={fieldWrap('pw')}>
            <Icon.Lock color="#9b9bab"/>
            <input
              type={showPw ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused('pw')}
              onBlur={() => setFocused(null)}
              autoComplete="current-password"
              style={{
                flex: 1, border: 0, outline: 'none', background: 'transparent',
                fontFamily: 'inherit', fontSize: 15, color: 'var(--ink)', minWidth: 0,
                letterSpacing: showPw ? 'normal' : '.15em',
              }}
            />
            <button type="button" onClick={() => setShowPw(s => !s)} aria-label="Afficher"
              style={{ border: 0, background: 'transparent', padding: 4, cursor: 'pointer', color: '#9b9bab' }}>
              <Icon.Eye/>
            </button>
          </div>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
          <a href="#" onClick={(e) => e.preventDefault()} style={{
            fontSize: 13, color: 'var(--magenta)', textDecoration: 'none', fontWeight: 600,
          }}>Mot de passe oublié ?</a>
        </div>

        <button type="submit" disabled={loading} className="tappable" style={{
          marginTop: 14, height: 54, border: 0, borderRadius: 14,
          background: 'var(--magenta)', color: '#fff',
          fontFamily: 'inherit', fontWeight: 700, fontSize: 16, letterSpacing: '-.005em',
          cursor: 'pointer',
          boxShadow: '0 8px 20px -8px rgba(233,30,140,.55), 0 2px 4px rgba(233,30,140,.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          {loading && (
            <span style={{
              width: 18, height: 18, borderRadius: 999,
              border: '2.5px solid rgba(255,255,255,.35)', borderTopColor: '#fff',
              animation: 'spin 0.8s linear infinite',
            }}/>
          )}
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <div style={{ flex: 1 }}/>
      <div style={{
        textAlign: 'center', fontSize: 11, color: '#aaaab8', letterSpacing: '.04em',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        CGS Porter · v2.4.1 · Zürich · Genève · Basel
      </div>
    </div>
  );
}
