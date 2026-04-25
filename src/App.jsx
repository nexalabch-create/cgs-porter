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
import { findPorter } from './data/porters.js';
import { useServices } from './hooks/useServices.js';

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
  const [activeId, setActiveId] = React.useState(null);
  const [assignTargetId, setAssignTargetId] = React.useState(null);

  const handleLogin = (role) => {
    const id = role === 'chef' ? 'mt' : 'p2';
    const u = findPorter(id);
    setUser({ ...u, role });
    setScreen('home');
  };

  const handleLogout = () => {
    setUser(null);
    setScreen('login');
  };

  // Visible services per role.
  const myServices = user?.role === 'porter'
    ? services.filter(s => s.assignedPorterId === user.id)
    : services;

  const active = services.find(s => s.id === activeId) || null;

  const openAssignSheet = (serviceId) => setAssignTargetId(serviceId);
  const closeAssignSheet = () => setAssignTargetId(null);
  const onPickPorter = (porterId) => {
    if (assignTargetId) assignPorter(assignTargetId, porterId);
    setAssignTargetId(null);
  };

  const selfAssign = (serviceId) => assignPorter(serviceId, user.id);

  // Chef "next unassigned" shortcuts on Home: open assign sheet or take it.
  const nextUnassigned = services.find(s => !s.assignedPorterId);
  const onAssignNext = () => nextUnassigned && openAssignSheet(nextUnassigned.id);
  const onSelfAssignNext = () => nextUnassigned && selfAssign(nextUnassigned.id);

  // Chef stats for the home header.
  const chefStats = {
    total: services.length,
    unassigned: services.filter(s => !s.assignedPorterId).length,
    done: services.filter(s => s.status === 'done').length,
  };

  // Porter Home stats.
  const porterStats = {
    services: myServices.length,
    remaining: '5h',
    cash: myServices.filter(s => s.status === 'done').reduce((sum, s) => sum + s.price, 0) || 147,
  };
  const porterNext = myServices.find(s => s.status === 'todo') || myServices[0];

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
            shift={{ code: 'CQ2', start: '14:15', end: '23:30', pause: 45 }}
            stats={chefStats}
            onAssignNext={onAssignNext}
            onSelfAssignNext={onSelfAssignNext}
            onOpenPlanning={() => setScreen('planning')}
          />
        )}
        {screen === 'home' && user && user.role === 'porter' && porterNext && (
          <HomeScreen
            firstName={user.firstName}
            nextService={porterNext}
            shift={{ code: 'CQ2', start: '14:15', end: '23:30', pause: 45 }}
            stats={porterStats}
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
            onOpen={(id) => { setActiveId(id); setScreen('detail'); }}
          />
        )}
        {screen === 'services' && user && user.role === 'porter' && (
          <ServicesScreen
            services={myServices}
            firstName={user.firstName}
            empty={myServices.length === 0}
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
        onClose={closeAssignSheet}
        onAssign={onPickPorter}
      />

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
