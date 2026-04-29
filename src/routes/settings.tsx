import { createRoute } from '@tanstack/react-router';
import { User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Route as rootRoute } from './__root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsView,
});

function SettingsView() {
  const session = useAuthStore((state) => state.session);
  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-0.5 text-sm">Manage your personal account and preferences</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><User className="text-slate-400"/> Active Profile</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">User ID</label>
            <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono block">{session?.user?.id || 'No active session'}</code>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email</label>
            <div className="text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">{session?.user?.email || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
