import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { isSupabaseConfigured } from '../lib/supabase.js';

export default function Login() {
  const { status, signIn } = useAuth();
  const [email, setEmail] = React.useState('mate.torgvaidze@cgs-ltd.com');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  if (status === 'authed') return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const r = await signIn({ email, password });
    setSubmitting(false);
    if (!r.ok) setError(r.error || 'Échec de la connexion.');
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
              type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="input mt-1.5"
            />
          </label>
          <label className="block">
            <span className="label">Mot de passe</span>
            <input
              type="password" autoComplete="current-password"
              required={isSupabaseConfigured}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="input mt-1.5"
              placeholder={isSupabaseConfigured ? '' : 'optionnel en mode démo'}
            />
          </label>

          {error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={submitting} className="btn-primary w-full h-11">
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        {!isSupabaseConfigured ? (
          <div className="mt-5 text-[11px] text-muted leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-3">
            <strong className="text-amber-900">Mode démo</strong> — n'importe quel e-mail entre,
            le rôle <code className="text-amber-900">chef</code> est attribué automatiquement.
          </div>
        ) : null}
      </div>
    </div>
  );
}
