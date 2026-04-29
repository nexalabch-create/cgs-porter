import React from 'react';
import LoginScreen from './screens/Login.jsx';
import HomeScreen from './screens/Home.jsx';
import ServicesScreen from './screens/Services.jsx';
import DetailScreen from './screens/Detail.jsx';
import PlanningScreen from './screens/Planning.jsx';
import ProfileScreen from './screens/Profile.jsx';
import ChefHomeScreen from './screens/ChefHome.jsx';
import ChefServicesScreen from './screens/ChefServices.jsx';
import AssignSheet from './components/AssignSheet.jsx';
import Toast from './components/Toast.jsx';
import NotificationsSheet from './components/NotificationsSheet.jsx';
import { findPorter as findDemoPorter } from './data/porters.js';
import { useServices } from './hooks/useServices.js';
import { useTodayPlanning } from './hooks/useTodayPlanning.js';
import { useUsers } from './hooks/useUsers.js';
import { useNotifications } from './hooks/useNotifications.js';
import { getSupabase, isSupabaseConfigured } from './lib/supabase.js';

// Supabase auth errors → user-friendly French messages.
function frenchAuthError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'E-mail ou mot de passe incorrect.';
  }
  if (msg.includes('email not confirmed')) return 'E-mail non confirmé. Contactez votre chef d’équipe.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('networkerror')) {
    return 'Problème de connexion réseau. Vérifiez votre connexion et réessayez.';
  }
  if (msg.startsWith('timeout:')) return 'Connexion trop lente. Réessayez dans un instant.';
  return 'Échec de la connexion. Réessayez ou contactez votre chef d’équipe.';
}

// Race a promise against a timeout — `withTimeout(p, 8000, 'signIn')`.
const withTimeout = (promise, ms, label) => Promise.race([
  promise,
  new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout:${label}`)), ms)),
]);

// Map a Supabase profile row → the shape the rest of the app uses.
const profileToUser = (profile) => ({
  id: profile.id,
  role: profile.role,
  email: profile.email,
  firstName: profile.first_name,
  lastName: profile.last_name,
  initials: profile.initials,
});

// Translate a shifts-table row into the shape expected by the home screens.
const shiftFromRow = (row) => row ? ({
  code: row.code,
  start: row.starts_at?.slice(0, 5),
  end:   row.ends_at?.slice(0, 5),
  pause: row.pause_minutes,
}) : null;

// Today's services. assignedPorterId === null → unassigned (chef must dispatch).
// In production this is `services` from Supabase, kept in sync via a realtime subscription.
const SAMPLE = [
  {
    id: 's1', flight: 'EK455', time: '14:30', client: 'Mr. Khalid Al-Mansouri',
    meeting: 'Terminal 1 · Porte A12', bags: 4, price: 73, status: 'todo',
    agency: 'Emirates VIP Services', phone: '+41 22 717 71 11', flow: 'Arrivée',
    remarques: '', assignedPorterId: null,
  },
  {
    id: 's2', flight: 'LX1820', time: '15:05', client: 'Mme Sophie Lefèvre',
    meeting: 'Terminal 2 · Comptoir First', bags: 2, price: 49, status: 'active',
    agency: 'Swiss First Lounge', phone: '+41 22 799 19 00', flow: 'Départ',
    remarques: 'Fauteuil roulant demandé.', elapsed: 754, assignedPorterId: 'p2',
  },
  {
    id: 's3', flight: 'AF231', time: '11:15', client: 'M. & Mme Tanaka',
    meeting: 'Hall des arrivées · P3', bags: 5, price: 85, status: 'done',
    agency: 'Air France Premium', phone: '+41 22 827 87 00', flow: 'Arrivée',
    remarques: '', elapsed: 1842, assignedPorterId: 'p2',
  },
  {
    id: 's4', flight: 'BA729', time: '16:40', client: 'Mr. Julian Whitford',
    meeting: 'Terminal 1 · Salon BA', bags: 3, price: 61, status: 'todo',
    agency: 'British Airways', phone: '+41 22 717 87 00', flow: 'Départ',
    remarques: '', assignedPorterId: null,
  },
  {
    id: 's5', flight: 'QR97', time: '18:00', client: 'Mlle Léa Bertrand',
    meeting: 'Terminal 1 · Bagages', bags: 1, price: 37, status: 'todo',
    agency: 'Qatar Privilege Club', phone: '+41 22 999 24 24', flow: 'Arrivée',
    remarques: '', assignedPorterId: 'p2',
  },
];

const TAB_ICONS = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>
    </svg>
  ),
  services: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="16" height="14" rx="2"/><path d="M9 6V4h6v2M8 11h8M8 15h5"/>
    </svg>
  ),
  planning: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>
    </svg>
  ),
  profile: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 5-6 8-6s7 2 8 6"/>
    </svg>
  ),
};

function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'home', label: 'Accueil', icon: TAB_ICONS.home },
    { id: 'services', label: 'Services', icon: TAB_ICONS.services },
    { id: 'planning', label: 'Planning', icon: TAB_ICONS.planning },
    { id: 'profile', label: 'Profil', icon: TAB_ICONS.profile },
  ];
  return (
    <div style={{
      flexShrink: 0, background: '#fff', borderTop: '1px solid #ececf1',
      padding: '8px 4px calc(env(safe-area-inset-bottom, 0px) + 8px)',
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    }}>
      {tabs.map(t => {
        const a = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} className="tappable" style={{
            border: 0, background: 'transparent', padding: '6px 4px', cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: a ? 'var(--magenta)' : '#9b9bab',
          }}>
            {t.icon}
            <span style={{ fontSize: 10.5, fontWeight: a ? 700 : 600, letterSpacing: '-.005em' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  const [user, setUser] = React.useState(null);
  // 'boot' = checking for an existing session; 'login' = show login screen;
  // others = authed app screens. Boot guards against the flicker where the
  // login screen flashes for ~150 ms before getSession() resolves.
  const [screen, setScreen] = React.useState(isSupabaseConfigured() ? 'boot' : 'login');
  // useServices switches automatically: real Supabase data + realtime sub when
  // configured, in-memory SAMPLE otherwise.
  const { services, assignPorter, updateService, isOnline } = useServices(SAMPLE);
  const { team: todayTeam, myShift } = useTodayPlanning(user?.id);
  const { users: realUsers } = useUsers();   // real Supabase users — UUIDs, used by AssignSheet
  const {
    notifications, unreadCount, markRead, markAllRead, remove, clearAll,
    latestUnseen, dismissLatest,
  } = useNotifications(user?.id);
  const [activeId, setActiveId] = React.useState(null);
  const [assignTargetId, setAssignTargetId] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [notifsOpen, setNotifsOpen] = React.useState(false);

  // Pop a toast when a fresh notification arrives in realtime — gives the
  // user immediate awareness without forcing them to open the bell.
  React.useEffect(() => {
    if (!latestUnseen) return;
    const p = latestUnseen.payload || {};
    let next = null;
    if (latestUnseen.type === 'service_assigned') {
      // Urgent variant + haptic vibration so the porter notices even if the
      // phone is in their pocket. The 3-pulse pattern is short enough not to
      // feel like a phone call but distinct from incoming SMS.
      try { navigator.vibrate?.([220, 100, 220, 100, 220]); } catch {}
      next = {
        variant: 'urgent',
        title: `Nouveau service · ${p.flight || ''} · ${p.time || ''}`.replace(/ ·\s+·/g, ' ·').trim(),
        subtitle: [p.client, p.meeting].filter(Boolean).join(' · ') || 'Touchez pour voir le détail',
        duration: 7000,
      };
    } else if (latestUnseen.type === 'service_started') {
      next = `${p.flight} démarré`;
    } else if (latestUnseen.type === 'service_completed') {
      next = `${p.flight} terminé`;
    }
    if (next) setToast(next);
    dismissLatest();
  }, [latestUnseen, dismissLatest]);

  // Resolve a porter for display (chips, toasts, etc) — try real users first,
  // fall back to the static demo array.
  const findPorter = React.useCallback((id) => {
    return realUsers.find((u) => u.id === id) || findDemoPorter(id);
  }, [realUsers]);

  // Restore an existing Supabase session on mount so users stay logged-in across
  // PWA reloads. The session in localStorage is the source of truth — if it's
  // there, we trust it and put the user back on home immediately. Profile
  // enrichment happens in the background; if it fails (RLS hiccup, transient
  // network), we keep the user logged in with whatever we have rather than
  // booting them to the login screen, which felt aggressive in production.
  React.useEffect(() => {
    if (!isSupabaseConfigured()) return;            // local-dev only path
    let cancelled = false;
    (async () => {
      try {
        const sb = await getSupabase();
        if (!sb) { if (!cancelled) setScreen('login'); return; }
        const { data: { session } } = await withTimeout(
          sb.auth.getSession(), 5000, 'getSession',
        );
        if (cancelled) return;
        if (!session) { setScreen('login'); return; }

        // Fall-back user from session metadata so the home renders even if
        // the profile fetch is slow or fails. We replace this with the full
        // profile row as soon as it arrives.
        setUser({
          id:        session.user.id,
          email:     session.user.email,
          firstName: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || '',
          lastName:  session.user.user_metadata?.last_name  || '',
          initials:  (session.user.user_metadata?.first_name?.[0] || '?').toUpperCase()
                   + (session.user.user_metadata?.last_name?.[0] || '').toUpperCase(),
          role:      session.user.user_metadata?.role || 'porter',
        });
        setScreen('home');

        // Background profile enrichment — non-blocking.
        try {
          const { data: profile } = await withTimeout(
            sb.from('users').select('*').eq('id', session.user.id).single(),
            6000, 'profile',
          );
          if (!cancelled && profile) setUser(profileToUser(profile));
        } catch (err) {
          console.warn('[boot] profile enrich failed (keeping session):', err?.message || err);
        }
      } catch (err) {
        console.warn('[boot] session restore failed:', err?.message || err);
        if (!cancelled) setScreen('login');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sign in with the real email + password the user typed. The Login screen
  // surfaces the returned `error` string to the user — we never silently
  // pretend a failed login succeeded.
  const handleLogin = async ({ email, password }) => {
    if (!isSupabaseConfigured()) {
      // Local-dev escape hatch only — Vercel always has env vars set, so this
      // branch never runs in production. Looks up the email in the static
      // sample roster so the dev UI is functional without a backend.
      const slug = String(email).split('@')[0].toLowerCase();
      const matched = findDemoPorter(slug === 'mate.torgvaidze' ? 'mt'
                                   : slug === 'marc.dubois'    ? 'p2'
                                   : null);
      if (matched) {
        setUser({ ...matched, role: slug.startsWith('mate') ? 'chef' : 'porter' });
        setScreen('home');
        return { ok: true };
      }
      return { ok: false, error: 'Mode démo : utilisateur introuvable.' };
    }

    try {
      const sb = await getSupabase();
      if (!sb) return { ok: false, error: 'Service non disponible. Réessayez plus tard.' };

      const { data: authData, error: authErr } = await withTimeout(
        sb.auth.signInWithPassword({ email, password }),
        8000, 'signIn',
      );
      if (authErr)            return { ok: false, error: frenchAuthError(authErr) };
      if (!authData?.user)    return { ok: false, error: 'Échec de la connexion.' };

      const { data: profile, error: profileErr } = await withTimeout(
        sb.from('users').select('*').eq('id', authData.user.id).single(),
        5000, 'profile',
      );
      if (profileErr || !profile) {
        // Auth succeeded but no public.users row — orphan account.
        try { await sb.auth.signOut({ scope: 'local' }); } catch {}
        return { ok: false, error: 'Compte non configuré. Contactez votre chef d’équipe.' };
      }

      setUser(profileToUser(profile));
      setScreen('home');
      return { ok: true };
    } catch (err) {
      console.error('[handleLogin] unhandled exception', err);
      return { ok: false, error: frenchAuthError(err) };
    }
  };

  // Send a password-reset email via Supabase. The link in the email opens
  // the Supabase-hosted reset page, which redirects back to the PWA on
  // success — that's good enough for production. We don't need a custom
  // /reset route in the app for this to work.
  const handleResetPassword = async (email) => {
    const trimmed = String(email || '').trim().toLowerCase();
    if (!trimmed) return { ok: false, error: 'Veuillez saisir votre e-mail.' };
    if (!isSupabaseConfigured()) return { ok: true };  // demo mode no-op
    try {
      const sb = await getSupabase();
      if (!sb) return { ok: false, error: 'Service non disponible.' };
      const redirectTo = `${window.location.origin}/`;
      const { error } = await withTimeout(
        sb.auth.resetPasswordForEmail(trimmed, { redirectTo }),
        8000, 'reset',
      );
      if (error) return { ok: false, error: frenchAuthError(error) };
      return { ok: true };
    } catch (err) {
      console.error('[handleResetPassword] unhandled', err);
      return { ok: false, error: frenchAuthError(err) };
    }
  };

  const handleLogout = async () => {
    // Always reset local state FIRST so the user lands on /login even if
    // signOut throws (expired session, network blip, etc). Otherwise an
    // exception would skip these two lines and the button looks broken.
    setUser(null);
    setScreen('login');
    setNotifsOpen(false);
    setAssignTargetId(null);
    setActiveId(null);
    if (isSupabaseConfigured()) {
      // We intentionally do NOT call sb.auth.signOut() here. That call fires
      // an HTTP request to /auth/v1/logout, which gets aborted by the reload
      // below. The aborted request leaves the Supabase backend in a state
      // where the next signInWithPassword (e.g. another user logging in on
      // the same device) returns 200 OK over HTTP but never resolves its
      // Promise — a deadlock that strands the login screen for 8 s+ until
      // our watchdog fires. Clearing storage + reloading is functionally
      // equivalent to a local-scope signOut without the HTTP side-effect.
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('sb-') || k.includes('supabase'))) localStorage.removeItem(k);
        }
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && (k.startsWith('sb-') || k.includes('supabase'))) sessionStorage.removeItem(k);
        }
      } catch {}
      try { window.location.reload(); } catch {}
    }
  };

  // Visible services per role.
  const myServices = user?.role === 'porter'
    ? services.filter(s => s.assignedPorterId === user.id)
    : services;

  const active = services.find(s => s.id === activeId) || null;

  const openAssignSheet = (serviceId) => setAssignTargetId(serviceId);
  const closeAssignSheet = () => setAssignTargetId(null);
  const onPickPorter = (porterId) => {
    if (assignTargetId) {
      const svc = services.find((s) => s.id === assignTargetId);
      const p = findPorter(porterId);
      const targetId = assignTargetId;
      // Async: surface BD/RLS/UUID errors as a red toast instead of silent
      // optimistic-update lies. Only show the success toast after the BD
      // confirms the UPDATE.
      (async () => {
        const result = await assignPorter(targetId, porterId);
        if (result?.error) {
          setToast(`⚠️ Échec de l'assignation — ${result.detail || result.error}`);
          return;
        }
        if (svc && p) {
          const isMe = porterId === user?.id;
          setToast(isMe
            ? `${svc.flight} · ${svc.time} — vous l'avez pris ✨`
            : `${svc.flight} · ${svc.time} assigné à ${p.firstName} ${p.lastName}`);
        }
      })();
    }
    setAssignTargetId(null);
  };

  const selfAssign = (serviceId) => {
    const svc = services.find((s) => s.id === serviceId);
    assignPorter(serviceId, user.id);
    if (svc) setToast(`${svc.flight} · ${svc.time} — vous l'avez pris ✨`);
  };

  // Chef "next unassigned" shortcuts on Home: open assign sheet or take it.
  const nextUnassigned = services.find(s => !s.assignedPorterId);
  const onAssignNext = () => nextUnassigned && openAssignSheet(nextUnassigned.id);
  const onSelfAssignNext = () => nextUnassigned && selfAssign(nextUnassigned.id);

  // Chef stats for the home header.
  const chefStats = {
    total: services.length,
    unassigned: services.filter(s => !s.assignedPorterId).length,
    done: services.filter(s => s.status === 'done').length,
    active: services.filter(s => s.status === 'active').length,
    todo: services.filter(s => s.status === 'todo').length,
  };

  // Porter Home stats.
  const porterStats = {
    services: myServices.length,
    remaining: '5h',
    cash: myServices.filter(s => s.status === 'done').reduce((sum, s) => sum + s.price, 0) || 147,
  };
  // Pick the most relevant service to show on the porter's home:
  //   1) currently in progress (active) — the one they're doing right now
  //   2) the next one to do (todo)
  //   3) null → triggers the "Aucun service prévu" empty state
  // (Falling back to myServices[0] used to surface a done service after the
  // porter completed everything, making it look like work hadn't ended.)
  const porterNext = myServices.find(s => s.status === 'active')
                  || myServices.find(s => s.status === 'todo')
                  || null;

  const showTabs = user && ['home', 'services', 'planning', 'profile'].includes(screen);
  const assignTarget = services.find(s => s.id === assignTargetId);

  return (
    <div style={{
      width: '100%', height: '100dvh',
      display: 'flex', flexDirection: 'column',
      background: '#fff', overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {screen === 'boot' && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 18,
            background: `
              radial-gradient(ellipse 80% 50% at 50% 0%, rgba(233,30,140,.06), transparent 60%),
              #fff
            `,
          }}>
            <img src="/logo-cgs.png" alt="CGS" style={{ height: 64, width: 'auto', objectFit: 'contain', opacity: .9 }}/>
            <span style={{
              width: 22, height: 22, borderRadius: 999,
              border: '2.5px solid rgba(233,30,140,.18)', borderTopColor: 'var(--magenta)',
              animation: 'spin 0.8s linear infinite',
            }}/>
          </div>
        )}
        {screen === 'login' && (
          <LoginScreen onLogin={handleLogin} onResetPassword={handleResetPassword}/>
        )}

        {screen === 'home' && user && user.role === 'chef' && (
          <ChefHomeScreen
            user={user}
            services={services}
            team={todayTeam}
            shift={shiftFromRow(myShift) || { code: '—', start: '—', end: '—', pause: 0 }}
            stats={chefStats}
            unreadCount={unreadCount}
            onOpenNotifications={() => setNotifsOpen(true)}
            onAssignNext={onAssignNext}
            onOpenPlanning={() => setScreen('planning')}
          />
        )}
        {screen === 'home' && user && user.role === 'porter' && porterNext && (
          <HomeScreen
            firstName={user.firstName}
            nextService={porterNext}
            shift={shiftFromRow(myShift) || { code: '—', start: '—', end: '—', pause: 0 }}
            stats={porterStats}
            unreadCount={unreadCount}
            onOpenNotifications={() => setNotifsOpen(true)}
            onOpenService={() => { setActiveId(porterNext.id); setScreen('detail'); }}
            onOpenPlanning={() => setScreen('planning')}
          />
        )}
        {screen === 'home' && user && user.role === 'porter' && !porterNext && (
          <ServicesScreen services={[]} firstName={user.firstName} empty onOpen={() => {}}/>
        )}

        {screen === 'services' && user && user.role === 'chef' && (
          <ChefServicesScreen
            user={user}
            services={services}
            unreadCount={unreadCount}
            onOpenNotifications={() => setNotifsOpen(true)}
            onOpen={(id) => { setActiveId(id); setScreen('detail'); }}
          />
        )}
        {screen === 'services' && user && user.role === 'porter' && (
          <ServicesScreen
            services={myServices}
            firstName={user.firstName}
            empty={myServices.length === 0}
            unreadCount={unreadCount}
            onOpenNotifications={() => setNotifsOpen(true)}
            onOpen={(id) => { setActiveId(id); setScreen('detail'); }}
          />
        )}

        {screen === 'detail' && active && user && (
          <DetailScreen
            service={active}
            user={user}
            onBack={() => setScreen('services')}
            onUpdate={updateService}
            onAssign={openAssignSheet}
            onSelfAssign={selfAssign}
          />
        )}

        {screen === 'planning' && (
          <PlanningScreen/>
        )}
        {screen === 'profile' && user && (
          <ProfileScreen user={user} onLogout={handleLogout}/>
        )}
      </div>
      {showTabs && <TabBar active={screen} onChange={setScreen}/>}

      <AssignSheet
        open={!!assignTargetId}
        service={assignTarget}
        users={realUsers}
        onClose={closeAssignSheet}
        onAssign={onPickPorter}
      />

      <NotificationsSheet
        open={notifsOpen}
        notifications={notifications}
        isChef={user?.role === 'chef'}
        onClose={() => setNotifsOpen(false)}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onRemove={remove}
        onClearAll={clearAll}
        onOpenService={(serviceId) => {
          // Tap a notification → close sheet, navigate to service detail.
          setNotifsOpen(false);
          setActiveId(serviceId);
          setScreen('detail');
        }}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />

      {/* Demo-mode flag — visible only when Supabase env vars aren't set.
          Lets QA + dev know that mutations stay in memory. */}
      {user && !isOnline ? (
        <div style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 4px)',
          left: '50%', transform: 'translateX(-50%)',
          padding: '3px 10px', borderRadius: 999,
          background: 'rgba(11,11,26,.65)', color: '#fff',
          fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none', zIndex: 100,
        }}>
          MODE DÉMO
        </div>
      ) : null}
    </div>
  );
}
