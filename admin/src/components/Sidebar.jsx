import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ListChecks, Users, CalendarDays,
  Star, BarChart3, Settings, LogOut,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';

const NAV = [
  { to: '/',            label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/services',    label: 'Services',   icon: ListChecks },
  { to: '/employes',    label: 'Employés',   icon: Users },
  { to: '/planning',    label: 'Planning',   icon: CalendarDays },
  { to: '/crm',         label: 'CRM Clients',icon: Star },
  { to: '/rapports',    label: 'Rapports',   icon: BarChart3 },
  { to: '/parametres',  label: 'Paramètres', icon: Settings },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();

  return (
    <aside className="w-60 shrink-0 bg-navy text-white flex flex-col">
      <div className="px-5 pt-7 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo-cgs.png" alt="CGS" className="h-8 w-auto bg-white rounded p-1" />
          <div>
            <div className="font-display text-base font-semibold tracking-tight leading-tight">
              CGS Porter
            </div>
            <div className="text-[11px] uppercase tracking-widest text-magenta-400">
              Admin Panel
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                isActive
                  ? 'bg-magenta text-white shadow-[0_8px_18px_-8px_rgba(233,30,140,.55)]'
                  : 'text-white/70 hover:text-white hover:bg-white/5',
              ].join(' ')
            }
          >
            <Icon size={18} strokeWidth={1.9} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        {profile ? (
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-magenta/20 text-magenta-200 flex items-center justify-center font-bold text-sm">
              {profile.initials || (profile.first_name?.[0] ?? '?') + (profile.last_name?.[0] ?? '')}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {profile.first_name} {profile.last_name}
              </div>
              <div className="text-[11px] text-white/50 truncate">{profile.email}</div>
            </div>
          </div>
        ) : null}
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition"
        >
          <LogOut size={16} strokeWidth={1.9} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
