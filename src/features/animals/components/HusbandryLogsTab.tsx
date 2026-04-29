import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { Loader2, ClipboardList } from 'lucide-react';

export function HusbandryLogsTab({ animalId }: { animalId: string }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['daily_logs', 'animal', animalId],
    queryFn: async () => {
      const res = await db.query(
        "SELECT * FROM daily_logs WHERE animal_id = $1 AND is_deleted = false ORDER BY log_date DESC, created_at DESC LIMIT 50",
        [animalId]
      );
      return res.rows;
    }
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6"><ClipboardList className="text-emerald-500"/> Recent Husbandry Logs</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No husbandry logs recorded for this animal.</p>
      ) : (
        logs.map(log => (
          <div key={log.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{new Date(log.log_date).toLocaleDateString()}</span>
              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{log.log_type}</span>
            </div>
            {log.notes && <p className="text-sm text-slate-700">{log.notes}</p>}
          </div>
        ))
      )}
    </div>
  );
}
