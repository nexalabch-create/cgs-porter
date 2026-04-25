import Sidebar from './Sidebar.jsx';
import { Outlet, useLocation } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabase.js';

export default function Layout() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
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
