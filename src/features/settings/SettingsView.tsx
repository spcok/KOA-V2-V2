import React, { useState } from 'react';
import { Database, RefreshCw, ShieldAlert, User, Download, CloudLightning, Loader2 } from 'lucide-react';
import { DatabaseHarness } from './components/DatabaseHarness';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState('sync'); // Default to sync for easier testing
  const session = useAuthStore((state) => state.session);
  const { isSyncing, lastSyncedAt, lastPushedAt, syncAll, pullFromCloud } = useSyncStore();

  const handleForceFullSync = async () => {
    if (window.confirm("WARNING: This will clear your high-water mark and download the entire database from Supabase. This may take a moment. Continue?")) {
      useSyncStore.setState({ lastSyncedAt: null });
      await pullFromCloud();
      alert("Full database sync complete. Your offline vault is now identical to the cloud.");
    }
  };

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
              <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} /> Sync Engine
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
                  <div className="text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">{session?.user?.email || 'N/A'}</div>
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
            <div className="max-w-2xl space-y-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><RefreshCw className="text-slate-400"/> Sync Engine Diagnostics</h2>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                 <h3 className="font-black text-slate-800 uppercase tracking-tight">Engine Status</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">High-Water Mark</p>
                       <p className="text-xs font-mono text-slate-700">{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never Synced (Full Pull)'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Local Mutation</p>
                       <p className="text-xs font-mono text-slate-700">{lastPushedAt ? new Date(lastPushedAt).toLocaleString() : 'No local edits detected'}</p>
                    </div>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm space-y-4 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <CloudLightning size={120} />
                 </div>
                 <h3 className="font-black text-blue-900 uppercase tracking-tight">Administrative Overrides</h3>
                 <p className="text-sm text-slate-500 max-w-md">Use these controls if you have manually imported data into Supabase and need to bypass the Delta Sync safeguards.</p>
                 
                 <div className="flex flex-col gap-3 pt-2 relative z-10">
                    <button 
                       onClick={() => syncAll()}
                       disabled={isSyncing}
                       className="w-full md:w-auto px-6 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                       {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} 
                       Trigger Standard Delta Sync
                    </button>

                    <button 
                       onClick={handleForceFullSync}
                       disabled={isSyncing}
                       className="w-full md:w-auto px-6 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                       {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} 
                       Wipe High-Water Mark & Force Full Download
                    </button>
                 </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
