import { createRootRoute, Outlet, useLocation, Link } from '@tanstack/react-router';
import { AuthGuard } from '../components/auth/AuthGuard';
import { useEffect, useState } from 'react';
import { initDb } from '../lib/db';
import { useAuthStore } from '../store/authStore';
import { useSyncStore } from '../store/syncStore';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();
  const { session } = useAuthStore();
  const { pullFromCloud } = useSyncStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    initDb().catch(console.error);
  }, []);

  useEffect(() => {
    if (session) {
      pullFromCloud().catch(console.error);
    }
  }, [session, pullFromCloud]);

  if (location.pathname === '/login') {
    return (
      <AuthGuard>
        <Outlet />
      </AuthGuard>
    );
  }

  const ActiveLink = ({ to, icon, label }: { to: string, icon: JSX.Element, label: string }) => (
    <Link
      to={to}
      activeProps={{ className: "bg-emerald-500 text-slate-900 font-bold shadow-sm" }}
      inactiveProps={{ className: "text-slate-300 hover:text-white hover:bg-slate-800/50" }}
      className={`flex items-center gap-3 px-3 py-2 rounded transition-all duration-200 ${isSidebarOpen ? '' : 'justify-center'}`}
      title={!isSidebarOpen ? label : undefined}
    >
      <div className="shrink-0">{icon}</div>
      {isSidebarOpen && <span className="text-sm truncate">{label}</span>}
    </Link>
  );

  const InactiveItem = ({ icon, label }: { icon: JSX.Element, label: string }) => (
    <div
      className={`flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 rounded cursor-not-allowed transition-all duration-200 ${isSidebarOpen ? '' : 'justify-center'}`}
      title={!isSidebarOpen ? `${label} (Coming Soon)` : undefined}
    >
      <div className="shrink-0 opacity-50">{icon}</div>
      {isSidebarOpen && <span className="text-sm truncate">{label}</span>}
    </div>
  );

  const Icons = {
    dashboard: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>,
    logs: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>,
    generic: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>,
    logistics: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>,
    safety: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>,
    cog: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>,
    admin: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>,
    logout: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
  };

  return (
    <AuthGuard>
      <div className="flex h-screen w-full bg-[#171f30] font-sans text-slate-300 overflow-hidden">
        
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} flex-shrink-0 flex flex-col border-r border-slate-800/50 transition-all duration-300 ease-in-out z-20 bg-[#171f30]`}>
          <div className="flex items-center justify-center h-16 px-4 bg-[#0f172a] shrink-0">
            {isSidebarOpen ? (
              <h1 className="text-xl font-bold tracking-tight text-white truncate w-full text-center transition-opacity duration-300">KOA Manager</h1>
            ) : (
              <h1 className="text-xl font-bold tracking-tight text-emerald-500 transition-opacity duration-300">KM</h1>
            )}
          </div>
          
          <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden flex flex-col gap-6 scrollbar-hide">
            
            <div>
              {isSidebarOpen && <div className="px-6 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-opacity duration-300">Overview</div>}
              <div className="px-3 space-y-1">
                <ActiveLink to="/" label="Dashboard" icon={Icons.dashboard} />
              </div>
            </div>

            <div>
              {isSidebarOpen && <div className="px-6 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-opacity duration-300">Husbandry</div>}
              <div className="px-3 space-y-1">
                <ActiveLink to="/daily-logs" label="Daily Logs" icon={Icons.logs} />
                <InactiveItem label="Daily Rounds" icon={Icons.logs} />
                <InactiveItem label="Tasks" icon={Icons.logs} />
                <InactiveItem label="Feeding Schedule" icon={Icons.logs} />
              </div>
            </div>

            <div>
              {isSidebarOpen && <div className="px-6 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-opacity duration-300">Animals</div>}
              <div className="px-3 space-y-1">
                <InactiveItem label="Animals" icon={Icons.generic} />
                <InactiveItem label="Clinical Notes" icon={Icons.generic} />
                <InactiveItem label="Medications" icon={Icons.generic} />
                <InactiveItem label="Quarantine" icon={Icons.generic} />
              </div>
            </div>

            <div>
              {isSidebarOpen && <div className="px-6 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-opacity duration-300">Logistics</div>}
              <div className="px-3 space-y-1">
                <InactiveItem label="Movements" icon={Icons.logistics} />
                <InactiveItem label="Flight Records" icon={Icons.logistics} />
              </div>
            </div>

            <div>
              {isSidebarOpen && <div className="px-6 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-opacity duration-300">Safety</div>}
              <div className="px-3 space-y-1">
                <InactiveItem label="Maintenance" icon={Icons.safety} />
              </div>
            </div>
          </nav>
          
          <div className="p-4 border-t border-slate-800/50 shrink-0 space-y-1">
            <ActiveLink to="/settings" label="Settings" icon={Icons.cog} />
            <ActiveLink to="/admin" label="Admin" icon={Icons.admin} />
            <InactiveItem label="Logout" icon={Icons.logout} />
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-slate-50 text-slate-900 border-l border-slate-300 relative min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 relative z-10 shadow-sm">
            <div className="flex items-center">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <svg className={`w-5 h-5 transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-1.5 border border-emerald-500 text-emerald-600 rounded-full text-sm font-bold tracking-wider hover:bg-emerald-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                CLOCK IN
              </button>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700 hidden sm:block">Charlotte Davis-Whytock</span>
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                  C
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto relative">
             <Outlet />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

