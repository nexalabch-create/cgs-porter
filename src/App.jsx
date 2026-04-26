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

const DEMO_EMAIL = {
  chef:   'mate.torgvaidze@cgs-ltd.com',
  porter: 'marc.dubois@cgs-ltd.com',
};
const DEMO_PASSWORD = 'CgsPorter2026!';

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
  const [screen, setScreen] = React.useState('login');
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
    let msg = '';
    if (latestUnseen.type === 'service_assigned') {
      msg = `Nouveau service : ${p.flight} · ${p.time}`;
    } else if (latestUnseen.type === 'service_started') {
      msg = `${p.flight} démarré`;
    } else if (latestUnseen.type === 'service_completed') {
      msg = `${p.flight} terminé`;
    }
    if (msg) setToast(msg);
    dismissLatest();
  }, [latestUnseen, dismissLatest]);

  // Resolve a porter for display (chips, toasts, etc) — try real users first,
  // fall back to the static demo array.
  const findPorter = React.useCallback((id) => {
    return realUsers.find((u) => u.id === id) || findDemoPorter(id);
  }, [realUsers]);

  // Sign in via real Supabase Auth so RLS policies work (auth.uid() is set).
  // RLS on services requires authenticated session — without it the porter
  // would see an empty list. The Login UI is still a role toggle (demo
  // shortcut); it submits the matching seed credentials behind the scenes.
  // Falls back to demo mode (in-memory SAMPLE) when Supabase isn't configured.
  const handleLogin = async (role) => {
    try {
      if (isSupabaseConfigured()) {
        const sb = await getSupabase();
        if (sb) {
          const email = DEMO_EMAIL[role];
          const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
            email,
            password: DEMO_PASSWORD,
          });
          if (!authErr && authData?.user) {
            // Fetch profile row (RLS allows reading own row).
            const { data: profile } = await sb
              .from('users').select('*').eq('id', authData.user.id).single();
            if (profile) {
              setUser({
                id: profile.id,
                role: profile.role,
                email: profile.email,
                firstName: profile.first_name,
                lastName: profile.last_name,
                initials: profile.initials,
              });
              setScreen('home');
              return;
            }
          } else if (authErr) {
            console.warn('[handleLogin] auth error', authErr);
          }
        }
      }
      // Demo fallback (no Supabase or auth failed).
      const id = role === 'chef' ? 'mt' : 'p2';
      const u = findPorter(id);
      setUser({ ...u, role });
      setScreen('home');
    } catch (err) {
      console.error('[handleLogin] unhandled exception', err);
      // Last-resort fallback so the user gets SOMEWHERE — better than a
      // dead spinner. Falls into demo mode with hardcoded names.
      setUser({
        id: role === 'chef' ? 'mt' : 'p2',
        firstName: role === 'chef' ? 'Mate' : 'Marc',
        lastName: role === 'chef' ? 'Torgvaidze' : 'Dubois',
        initials: role === 'chef' ? 'MT' : 'MD',
        role,
      });
      setScreen('home');
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
      try {
        const sb = await getSupabase();
        if (sb) await sb.auth.signOut();
      } catch (e) {
        console.warn('[handleLogout] signOut failed (state already reset):', e);
      }
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
        {screen === 'login' && (
          <LoginScreen onLogin={handleLogin}/>
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
