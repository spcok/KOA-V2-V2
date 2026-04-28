import React, { useState } from 'react';
import { Database, Settings, RefreshCw, ShieldAlert, User } from 'lucide-react';
import { DatabaseHarness } from './components/DatabaseHarness';
import { useAuthStore } from '../../store/authStore';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState('database');
  const session = useAuthStore((state) => state.session);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings & Admin</h1>
          <p className="text-slate-500 mt-0.5 text-sm">System configuration and local vault diagnostics</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 shrink-0">
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'}`}
            >
              <User size={18} /> Profile
            </button>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400">Admin Diagnostics</p>
            </div>
            <button 
              onClick={() => setActiveTab('database')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'database' ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'}`}
            >
              <Database size={18} /> Database Harness
            </button>
            <button 
              onClick={() => setActiveTab('sync')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'sync' ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'}`}
            >
              <RefreshCw size={18} /> Sync Engine
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-x-auto bg-slate-50/50">
          {activeTab === 'profile' && (
            <div className="max-w-xl">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><User className="text-slate-400"/> Active Session</h2>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">User UUID</label>
                  <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono select-all">{session?.user?.id || 'No active session'}</code>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email</label>
                  <div className="text-sm font-medium text-slate-900">{session?.user?.email || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="text-amber-500" size={20} />
                <h2 className="text-lg font-bold text-slate-800">Local PGLite Test Harness</h2>
              </div>
              <p className="text-sm text-slate-500 mb-6">Execute direct reads against the local IndexedDB offline vault. Do not perform manual writes here.</p>
              <DatabaseHarness />
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="max-w-xl">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><RefreshCw className="text-slate-400"/> Sync Engine Diagnostics</h2>
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <RefreshCw size={32} className="text-blue-500" />
                </div>
                <h3 className="font-bold text-slate-800">Delta Sync Module</h3>
                <p className="text-sm text-slate-500 mt-2">The Sync Engine UI will be implemented during Phase 13 of the architectural refactor.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
