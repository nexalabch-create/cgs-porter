// useAuth — provides `{ user, profile, status, signIn, signOut }`.
// In demo mode (no Supabase env vars) accepts any email and pretends to log in
// with role='chef' so the panel is explorable without a backend.
import React from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const STORAGE_KEY = 'cgs-admin-demo-user';

const AuthCtx = React.createContext(null);

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

    // Fetch the profile in the background. Crucially, we DO NOT block the
    // status='authed' transition on the profile fetch — if RLS or the
    // network hangs, the UI would stay stuck on "Chargement…" forever.
    // Instead, set status='authed' the moment we know the session is
    // valid; let the profile arrive (or not) in parallel.
    const loadProfile = (userId) => {
      supabase.from('users').select('*').eq('id', userId).single()
        .then(({ data, error }) => {
          if (!mounted) return;
          if (error) console.warn('[useAuth] profile fetch failed:', error.message);
          setProfile(data ?? null);
        });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session) { setStatus('guest'); return; }
      setUser(session.user);
      setStatus('authed');         // unblock UI immediately
      loadProfile(session.user.id); // background — non-blocking
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
    if (!isSupabaseConfigured) {
      const fake = {
        id: 'mt', email, role: 'chef',
        first_name: 'Mate', last_name: 'Torgvaidze', initials: 'MT',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fake));
      setUser(fake); setProfile(fake); setStatus('authed');
      return { ok: true };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null); setProfile(null); setStatus('guest');
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthCtx.Provider value={{ user, profile, status, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => React.useContext(AuthCtx);
