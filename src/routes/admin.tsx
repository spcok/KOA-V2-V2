import { createFileRoute } from '@tanstack/react-router';
import { ShieldAlert, Database } from 'lucide-react';
import { DatabaseHarness } from '../features/admin/components/DatabaseHarness';

export const Route = createFileRoute('/admin')({
  component: AdminView,
});

function AdminView() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldAlert className="text-amber-500" size={32} /> Admin Center
        </h1>
        <p className="text-slate-500 mt-0.5 text-sm">System diagnostics and vault control</p>
      </div>
      
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
