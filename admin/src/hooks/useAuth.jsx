// useAuth — provides `{ user, profile, status, signIn, signOut, sendResetEmail }`.
// In demo mode (no Supabase env vars) accepts any email and pretends to log in
// with role='chef' so the panel is explorable without a backend.
import React from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const STORAGE_KEY = 'cgs-admin-demo-user';
const LAST_EMAIL_KEY = 'cgs-admin-last-email';

const AuthCtx = React.createContext(null);

// Race a promise against a timeout — `withTimeout(p, 5000, 'getSession')`.
const withTimeout = (promise, ms, label) => Promise.race([
  promise,
  new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout:${label}`)), ms)),
]);

// Supabase auth errors → user-friendly French.
export function frenchAuthError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'E-mail ou mot de passe incorrect.';
  }
  if (msg.includes('email not confirmed')) return 'E-mail non confirmé. Vérifiez votre boîte de réception.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('networkerror')) {
    return 'Problème de connexion réseau. Vérifiez votre connexion.';
  }
  if (msg.startsWith('timeout:')) return 'Connexion trop lente. Réessayez dans un instant.';
  return 'Échec de la connexion. Réessayez ou contactez l’administrateur.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [profile, setProfile] = React.useState(null);
  const [status, setStatus] = React.useState('loading'); // loading | authed | guest

  // Boot
  React.useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        setProfile(u);
        setStatus('authed');
      } else {
        setStatus('guest');
      }
      return;
    }

    // Fetch the profile in the background. We DO NOT block status='authed' on
    // the profile — RLS or network hiccups could otherwise strand us forever.
    const loadProfile = (userId) => {
      withTimeout(
        supabase.from('users').select('*').eq('id', userId).single(),
        5000, 'profile',
      ).then(({ data, error }) => {
        if (!mounted) return;
        if (error) console.warn('[useAuth] profile fetch failed:', error.message || error);
        setProfile(data ?? null);
      }).catch((err) => {
        if (!mounted) return;
        console.warn('[useAuth] profile fetch threw:', err?.message || err);
        setProfile(null);
      });
    };

    // 5-second watchdog: if getSession() hangs (offline, broken cache, etc.),
    // drop to 'guest' so the login screen renders instead of an infinite spinner.
    withTimeout(supabase.auth.getSession(), 5000, 'getSession')
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (!session) { setStatus('guest'); return; }
        setUser(session.user);
        setStatus('authed');
        loadProfile(session.user.id);
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn('[useAuth] getSession failed/timed out:', err?.message || err);
        setStatus('guest');
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) { setUser(null); setProfile(null); setStatus('guest'); return; }
      setUser(session.user);
      setStatus('authed');
      loadProfile(session.user.id);
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const signIn = async ({ email, password }) => {
    const trimmed = String(email || '').trim().toLowerCase();
    if (!trimmed) return { ok: false, error: 'Veuillez saisir votre e-mail.' };

    if (!isSupabaseConfigured) {
      const fake = {
        id: 'mt', email: trimmed, role: 'chef',
        first_name: 'Mate', last_name: 'Torgvaidze', initials: 'MT',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fake));
      try { localStorage.setItem(LAST_EMAIL_KEY, trimmed); } catch {}
      setUser(fake); setProfile(fake); setStatus('authed');
      return { ok: true };
    }

    if (!password) return { ok: false, error: 'Veuillez saisir votre mot de passe.' };

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: trimmed, password }),
        8000, 'signIn',
      );
      if (error) return { ok: false, error: frenchAuthError(error) };
      if (!data?.user) return { ok: false, error: 'Échec de la connexion.' };

      // Load profile synchronously so we can verify role BEFORE granting access.
      // ProtectedRoute also guards on profile.role but we want to fail-fast
      // here so the login screen can show a clear "access refused" message
      // instead of momentarily landing the user inside the panel.
      const { data: prof, error: profErr } = await withTimeout(
        supabase.from('users').select('*').eq('id', data.user.id).single(),
        5000, 'profile',
      );
      if (profErr || !prof) {
        try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
        return { ok: false, error: 'Compte non configuré. Contactez l’administrateur.' };
      }
      if (prof.role !== 'chef') {
        try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
        return { ok: false, error: 'Le panel d’administration est réservé aux chefs d’équipe.' };
      }

      try { localStorage.setItem(LAST_EMAIL_KEY, trimmed); } catch {}
      setProfile(prof);
      // user/status get set by onAuthStateChange — no race because both
      // states converge to 'authed' for the same session.
      return { ok: true };
    } catch (err) {
      console.error('[useAuth.signIn] unhandled', err);
      return { ok: false, error: frenchAuthError(err) };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null); setProfile(null); setStatus('guest');
      return;
    }
    // scope:'local' clears storage + emits SIGNED_OUT synchronously, no HTTP.
    // Avoids the race where a global signOut in flight gets aborted by the
    // next signIn and leaves the auth lock half-held.
    try { await supabase.auth.signOut({ scope: 'local' }); } catch (e) {
      console.warn('[useAuth.signOut] failed:', e?.message || e);
      setUser(null); setProfile(null); setStatus('guest');
    }
    // Hard reload — same reasoning as mobile: nukes the GoTrueClient + all
    // realtime subs so the next user (or same user re-logging in) gets a
    // fresh state. Without this, sign-in immediately after sign-out can hang.
    try { window.location.assign('/login'); } catch {}
  };

  const sendResetEmail = async (email) => {
    const trimmed = String(email || '').trim().toLowerCase();
    if (!trimmed) return { ok: false, error: 'Veuillez saisir votre e-mail.' };
    if (!isSupabaseConfigured) return { ok: true };  // demo mode no-op
    try {
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (error) return { ok: false, error: frenchAuthError(error) };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: frenchAuthError(err) };
    }
  };

  return (
    <AuthCtx.Provider value={{ user, profile, status, signIn, signOut, sendResetEmail }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => React.useContext(AuthCtx);
export const LAST_ADMIN_EMAIL_KEY = LAST_EMAIL_KEY;
