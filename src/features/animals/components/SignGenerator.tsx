import React, { useState, useEffect } from 'react';
import { MonitorX, WifiOff, FileText, Loader2, Save } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { queryClient } from '../../../lib/queryClient';
import { useAuthStore } from '../../../store/authStore';
import { useSyncStore } from '../../../store/syncStore';

export function SignGenerator({ animal, onClose }: { animal: any, onClose: () => void }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [signText, setSignText] = useState(animal.sign_content || '');
  
  const currentUserId = useAuthStore(s => s.session?.user?.id);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    const handleOnline = () => setIsOffline(!navigator.onLine);
    window.addEventListener('resize', handleResize);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOnline);
    return () => { window.removeEventListener('resize', handleResize); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOnline); }
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await db.query(`UPDATE animals SET sign_content = $1, updated_at = now(), modified_by = $2 WHERE id = $3`, [signText, currentUserId, animal.id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animal', animal.id] });
      useSyncStore.getState().pushToCloud().catch(console.error);
      alert('Sign cached to database successfully.');
    }
  });

  // HARDWARE GATES
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl max-w-sm text-center space-y-4">
          <MonitorX size={48} className="mx-auto text-rose-500" />
          <h2 className="text-lg font-black uppercase text-slate-800">Desktop Required</h2>
          <p className="text-sm text-slate-500">The Sign Generator requires a larger screen to render printable PDF assets. Please access this tool from a computer or large tablet.</p>
          <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold uppercase text-xs">Close</button>
        </div>
      </div>
    );
  }

  if (isOffline && !animal.sign_content) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl max-w-sm text-center space-y-4">
          <WifiOff size={48} className="mx-auto text-amber-500" />
          <h2 className="text-lg font-black uppercase text-slate-800">Network Required</h2>
          <p className="text-sm text-slate-500">You must be connected to the internet to query the AI Gemini engine. Please reconnect to generate new signage.</p>
          <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold uppercase text-xs">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-8">
      <div className="bg-slate-100 w-full max-w-5xl h-full max-h-[800px] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-black text-slate-800 uppercase flex items-center gap-2"><FileText className="text-indigo-500"/> Sign Generator: {animal.name}</h2>
          <div className="flex gap-2">
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase flex items-center gap-2">{saveMutation.isPending ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Cache Sign</button>
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-xs uppercase">Close</button>
          </div>
        </div>
        <div className="flex-1 p-8 overflow-y-auto">
           {/* Future AI Hook integration goes here. For now, a manual override field representing the generated text */}
           <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Sign Text Content (AI Output)</label>
           <textarea value={signText} onChange={e => setSignText(e.target.value)} className="w-full h-64 p-4 border border-slate-200 rounded-xl font-medium text-sm focus:outline-none focus:border-indigo-500 shadow-sm" placeholder="AI generated text will appear here..."></textarea>
        </div>
      </div>
    </div>
  );
}
