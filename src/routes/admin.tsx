import { createRoute } from '@tanstack/react-router';
import { ShieldAlert, Database, RefreshCw, Download, CloudLightning, Loader2 } from 'lucide-react';
import { DatabaseHarness } from '../features/admin/components/DatabaseHarness';
import { Route as rootRoute } from './__root';
import { useSyncStore } from '../store/syncStore';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminView,
});

function AdminView() {
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldAlert className="text-amber-500" size={32} /> Admin Command Center
        </h1>
        <p className="text-slate-500 mt-0.5 text-sm">System diagnostics, sync overrides, and vault control</p>
      </div>
      
      {/* SYNC ENGINE CARD */}
      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden relative">
         <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <CloudLightning size={160} />
         </div>
         <div className="p-6 border-b border-slate-100 bg-blue-50/50">
           <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2"><RefreshCw className={`text-blue-500 ${isSyncing ? "animate-spin" : ""}`}/> Sync Engine Overrides</h2>
           <p className="text-sm text-blue-700 mt-1 max-w-2xl">Manage high-water marks and force manual database replication from the cloud.</p>
         </div>
         <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-4">
                 <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Engine Status</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">High-Water Mark</p>
                       <p className="text-xs sm:text-sm font-mono text-slate-700">{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never Synced (Full Pull required)'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Local Edit</p>
                       <p className="text-xs sm:text-sm font-mono text-slate-700">{lastPushedAt ? new Date(lastPushedAt).toLocaleString() : 'No local edits detected'}</p>
                    </div>
                 </div>
            </div>
            <div className="space-y-4">
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Manual Triggers</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                       onClick={() => syncAll()}
                       disabled={isSyncing}
                       className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                       {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Standard Delta Sync
                    </button>

                    <button 
                       onClick={handleForceFullSync}
                       disabled={isSyncing}
                       className="flex-1 px-4 py-3 bg-rose-100 hover:bg-rose-200 border border-rose-200 text-rose-700 rounded-xl font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                       {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Force Full Download
                    </button>
                </div>
            </div>
         </div>
      </div>

      {/* DATABASE HARNESS CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Database className="text-slate-400"/> Database Test Modules</h2>
           <p className="text-sm text-slate-500 mt-1">Select a module to run a direct read-query against the local offline PGLite vault.</p>
        </div>
        <div className="flex-1 p-6 bg-slate-50/30 overflow-x-auto">
          <DatabaseHarness />
        </div>
      </div>
    </div>
  );
}
