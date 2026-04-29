import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, LAST_ADMIN_EMAIL_KEY } from '../hooks/useAuth.jsx';
import { isSupabaseConfigured } from '../lib/supabase.js';

export default function Login() {
  const { status, signIn, sendResetEmail } = useAuth();
  const [email, setEmail] = React.useState(() => {
    try { return localStorage.getItem(LAST_ADMIN_EMAIL_KEY) || 'mate.torgvaidze@cgs-ltd.com'; }
    catch { return 'mate.torgvaidze@cgs-ltd.com'; }
  });
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [resetMode, setResetMode] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const [resetSending, setResetSending] = React.useState(false);

  if (status === 'authed') return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const r = await signIn({ email, password });
    setSubmitting(false);
    if (!r.ok) setError(r.error || 'Échec de la connexion.');
  };

  const sendReset = async (e) => {
    e.preventDefault();
    if (resetSending) return;
    setError(null);
    setResetSending(true);
    const r = await sendResetEmail(email);
    setResetSending(false);
    if (!r.ok) { setError(r.error || 'Échec de l’envoi.'); return; }
    setResetSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{
           background: `
             radial-gradient(ellipse 70% 40% at 30% 0%, rgba(233,30,140,.10), transparent 60%),
             radial-gradient(ellipse 60% 40% at 100% 100%, rgba(26,26,94,.08), transparent 70%),
             #fafafd
           `,
         }}>
      <div className="card p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo-cgs.png" alt="CGS" className="h-9 w-auto" />
          <div>
            <div className="font-display text-lg font-semibold tracking-tight leading-none">
              CGS Porter
            </div>
            <div className="text-[10px] uppercase tracking-widest text-magenta mt-1">
              Admin Panel
            </div>
          </div>
        </div>

        {!resetMode ? (
          <>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Connexion
            </h1>
            <p className="mt-1 text-sm text-muted">
              Réservé aux chefs d'équipe.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block">
                <span className="label">E-mail</span>
                <input
                  type="email" autoComplete="username" required
                  autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                  className="input mt-1.5"
                  placeholder="prenom.nom@cgs-ltd.com"
                />
              </label>
              <label className="block">
                <span className="label">Mot de passe</span>
                <input
                  type="password" autoComplete="current-password"
                  required={isSupabaseConfigured}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                  className="input mt-1.5"
                  placeholder={isSupabaseConfigured ? '' : 'optionnel en mode démo'}
                />
              </label>

              {error ? (
                <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 leading-snug">
                  {error}
                </div>
              ) : null}

              <button type="submit" disabled={submitting} className="btn-primary w-full h-11">
                {submitting ? 'Connexion…' : 'Se connecter'}
              </button>

              {isSupabaseConfigured ? (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setResetMode(true); setError(null); setResetSent(false); }}
                    className="text-[13px] text-magenta font-semibold hover:underline">
                    Mot de passe oublié ?
                  </button>
                </div>
              ) : null}
            </form>

            {!isSupabaseConfigured ? (
              <div className="mt-5 text-[11px] text-muted leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-3">
                <strong className="text-amber-900">Mode démo</strong> — n'importe quel e-mail entre,
                le rôle <code className="text-amber-900">chef</code> est attribué automatiquement.
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Mot de passe oublié
            </h1>
            <p className="mt-1 text-sm text-muted">
              Saisissez votre e-mail. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            {resetSent ? (
              <div className="mt-6 text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-3 leading-snug">
                Lien envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception (et les spams).
              </div>
            ) : (
              <form onSubmit={sendReset} className="mt-6 space-y-4">
                <label className="block">
                  <span className="label">E-mail</span>
                  <input
                    type="email" autoComplete="username" required
                    autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                    className="input mt-1.5"
                    placeholder="prenom.nom@cgs-ltd.com"
                  />
                </label>
                {error ? (
                  <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 leading-snug">
                    {error}
                  </div>
                ) : null}
                <button type="submit" disabled={resetSending} className="btn-primary w-full h-11">
                  {resetSending ? 'Envoi…' : 'Envoyer le lien'}
                </button>
              </form>
            )}

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setResetMode(false); setError(null); setResetSent(false); }}
                className="text-[13px] text-muted hover:text-ink hover:underline">
                ← Retour à la connexion
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
