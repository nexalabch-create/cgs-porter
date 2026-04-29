import React from 'react';
import { Icon } from '../components/Icons.jsx';

const LAST_EMAIL_KEY = 'cgs.lastEmail';
// Default placeholder when no previous login is remembered. Lets the
// porter (or chef) just type the password and tap "Se connecter" the
// first time, without having to remember the full email format.
const DEFAULT_EMAIL = 'marc.dubois@cgs-ltd.com';

export default function LoginScreen({ onLogin, onResetPassword }) {
  const [email, setEmail] = React.useState(() => {
    try { return localStorage.getItem(LAST_EMAIL_KEY) || DEFAULT_EMAIL; }
    catch { return DEFAULT_EMAIL; }
  });
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [focused, setFocused] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Reset-password sub-flow.
  const [resetMode, setResetMode] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const [resetSending, setResetSending] = React.useState(false);

  const submit = async (e) => {
    if (e) { e.preventDefault?.(); e.stopPropagation?.(); }
    if (loading) return;
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { setError('Veuillez saisir votre e-mail.'); return; }
    if (!password)     { setError('Veuillez saisir votre mot de passe.'); return; }

    setLoading(true);
    try {
      const result = await onLogin({ email: trimmedEmail, password });
      if (result && result.ok === false) {
        setError(result.error || 'Échec de la connexion.');
      } else if (result && result.ok) {
        try { localStorage.setItem(LAST_EMAIL_KEY, trimmedEmail); } catch {}
      }
    } catch (err) {
      console.error('[Login.submit] unhandled', err);
      setError('Erreur inattendue. Réessayez dans un instant.');
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async (e) => {
    if (e) { e.preventDefault?.(); e.stopPropagation?.(); }
    if (resetSending) return;
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Veuillez saisir votre e-mail.'); return; }
    setResetSending(true);
    try {
      const r = await onResetPassword?.(trimmed);
      if (r && r.ok === false) {
        setError(r.error || 'Échec de l’envoi.');
      } else {
        setResetSent(true);
      }
    } catch (err) {
      console.error('[Login.sendReset] unhandled', err);
      setError('Erreur inattendue. Réessayez dans un instant.');
    } finally {
      setResetSending(false);
    }
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
        }}>
          {resetMode
            ? 'Saisissez votre e-mail pour recevoir un lien de réinitialisation.'
            : 'Connectez-vous pour accéder à vos services du jour.'}
        </p>
      </div>

      {!resetMode ? (
        <form onSubmit={submit} style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.005em' }}>E-mail</span>
            <div style={fieldWrap('email')}>
              <Icon.Mail color="#9b9bab"/>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder="prenom.nom@cgs-ltd.com"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
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
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                onFocus={() => setFocused('pw')}
                onBlur={() => setFocused(null)}
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  flex: 1, border: 0, outline: 'none', background: 'transparent',
                  fontFamily: 'inherit', fontSize: 15, color: 'var(--ink)', minWidth: 0,
                }}
              />
              <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                style={{ border: 0, background: 'transparent', padding: 4, cursor: 'pointer', color: '#9b9bab' }}>
                <Icon.Eye/>
              </button>
            </div>
          </label>

          {error ? (
            <div role="alert" style={{
              fontSize: 13, color: '#b00020', background: '#fdecef',
              border: '1px solid #f7c1cb', borderRadius: 10, padding: '10px 12px',
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="tappable"
            onTouchEnd={(e) => {
              // iOS PWA shells sometimes swallow click events; touchend ensures
              // the submit always reaches us. We prevent default to avoid the
              // click being fired twice afterwards.
              e.preventDefault?.();
              if (!loading) submit(e);
            }}
            style={{
              marginTop: 8, height: 54, border: 0, borderRadius: 14,
              background: loading
                ? 'linear-gradient(135deg, #f9a4cf 0%, #d889b6 100%)'
                : 'linear-gradient(135deg, #f23ba0 0%, #c2127a 100%)',
              color: '#fff',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 16, letterSpacing: '-.005em',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 10px 24px -10px rgba(233,30,140,.65), inset 0 1px 0 rgba(255,255,255,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'background .15s ease',
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

          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <button
              type="button"
              onClick={() => { setResetMode(true); setError(null); setResetSent(false); }}
              style={{
                border: 0, background: 'transparent', padding: 8, cursor: 'pointer',
                fontSize: 13, color: 'var(--magenta)', fontWeight: 600,
                fontFamily: 'inherit',
              }}>
              Mot de passe oublié ?
            </button>
          </div>
        </form>
      ) : (
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {resetSent ? (
            <div role="status" style={{
              fontSize: 13, color: '#0a6b3b', background: '#e8f6ee',
              border: '1px solid #b9e0c8', borderRadius: 10, padding: '12px 14px',
              lineHeight: 1.45,
            }}>
              Lien envoyé à <strong>{email.trim().toLowerCase()}</strong>. Vérifiez votre boîte
              de réception (et les spams).
            </div>
          ) : (
            <form onSubmit={sendReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>E-mail</span>
                <div style={fieldWrap('reset-email')}>
                  <Icon.Mail color="#9b9bab"/>
                  <input
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                    onFocus={() => setFocused('reset-email')}
                    onBlur={() => setFocused(null)}
                    placeholder="prenom.nom@cgs-ltd.com"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{
                      flex: 1, border: 0, outline: 'none', background: 'transparent',
                      fontFamily: 'inherit', fontSize: 15, color: 'var(--ink)', minWidth: 0,
                    }}
                  />
                </div>
              </label>

              {error ? (
                <div role="alert" style={{
                  fontSize: 13, color: '#b00020', background: '#fdecef',
                  border: '1px solid #f7c1cb', borderRadius: 10, padding: '10px 12px',
                  lineHeight: 1.4,
                }}>
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={resetSending}
                className="tappable"
                style={{
                  marginTop: 4, height: 54, border: 0, borderRadius: 14,
                  background: resetSending
                    ? 'linear-gradient(135deg, #f9a4cf 0%, #d889b6 100%)'
                    : 'linear-gradient(135deg, #f23ba0 0%, #c2127a 100%)',
                  color: '#fff',
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 16, letterSpacing: '-.005em',
                  cursor: resetSending ? 'wait' : 'pointer',
                  boxShadow: '0 10px 24px -10px rgba(233,30,140,.65), inset 0 1px 0 rgba(255,255,255,.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'background .15s ease',
                }}>
                {resetSending && (
                  <span style={{
                    width: 18, height: 18, borderRadius: 999,
                    border: '2.5px solid rgba(255,255,255,.35)', borderTopColor: '#fff',
                    animation: 'spin 0.8s linear infinite',
                  }}/>
                )}
                {resetSending ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <button
              type="button"
              onClick={() => { setResetMode(false); setError(null); setResetSent(false); }}
              style={{
                border: 0, background: 'transparent', padding: 8, cursor: 'pointer',
                fontSize: 13, color: 'var(--muted)', fontWeight: 600,
                fontFamily: 'inherit',
              }}>
              ← Retour à la connexion
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}/>
      <div style={{
        textAlign: 'center', fontSize: 11, color: '#aaaab8', letterSpacing: '.04em',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        CGS Porter · v2.5.0 · Zürich · Genève · Basel
      </div>
    </div>
  );
}
