import React from 'react';
import Sidebar from './Sidebar.jsx';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase.js';

export default function Layout() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Close mobile drawer on route change so the user lands on the new page.
  React.useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen flex relative">
      {/* Sidebar:
          · md+ (≥768px): static, always visible at width 240px.
          · < md (mobile): fixed off-canvas drawer that slides in from
            the left when `drawerOpen` is true. */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-40 w-60 transform transition-transform duration-200 ease-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
          'md:relative md:translate-x-0 md:transform-none md:transition-none',
        ].join(' ')}
      >
        <Sidebar onNavClick={() => setDrawerOpen(false)} />
      </div>

      {/* Backdrop — only on mobile and only when the drawer is open. */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-ink/40 z-30 md:hidden"
          aria-hidden="true"
        />
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar with hamburger + brand. Hidden on md+. */}
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
            className="p-2 -m-2 text-ink hover:bg-slate-100 rounded-lg transition"
          >
            <Menu size={22} strokeWidth={2} />
          </button>
          <img src="/logo-cgs.png" alt="CGS" className="h-7 w-auto" />
          <div className="font-display text-sm font-semibold tracking-tight leading-none">
            CGS Porter
            <span className="ml-1.5 text-[10px] uppercase tracking-widest text-magenta font-bold">
              Admin
            </span>
          </div>
        </div>

        {!isSupabaseConfigured ? (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-6 py-2 text-xs font-semibold flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500"/>
            MODE DÉMO — aucune base configurée. Définis VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY puis redémarre.
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto min-h-screen" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
