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

  const getTypeColor = (type: string) => {
    switch(type.toUpperCase()) {
      case 'FEED': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'WEIGHT': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'MEDICAL': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'CLEAN': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
         <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><ClipboardList className="text-emerald-500"/> Recent Husbandry Logs</h3>
         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{logs.length} Records</span>
      </div>
      
      {logs.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl"><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">No husbandry logs recorded</p></div>
      ) : (
        logs.map(log => (
          <div key={log.id} className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 transition-all hover:border-slate-300">
            <div className="w-full sm:w-32 shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{new Date(log.log_date).toLocaleDateString()}</span>
              <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-lg tracking-widest border inline-block ${getTypeColor(log.log_type)}`}>{log.log_type}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap mb-3">{log.notes || 'No observational notes provided.'}</p>
              
              <div className="flex flex-wrap gap-2">
                 {log.weight_grams > 0 && <span className="text-xs font-bold bg-slate-50 border border-slate-100 text-slate-600 px-2 py-1 rounded-md">Weight: {log.weight_grams}{log.weight_unit}</span>}
                 {log.food && log.food !== 'N/A' && <span className="text-xs font-bold bg-slate-50 border border-slate-100 text-slate-600 px-2 py-1 rounded-md">Food: {log.quantity > 0 ? `${log.quantity}x ` : ''}{log.food}</span>}
                 {log.temperature_c !== null && <span className="text-xs font-bold bg-slate-50 border border-slate-100 text-slate-600 px-2 py-1 rounded-md">Temp: {log.temperature_c}°C</span>}
                 {log.basking_temp_c !== null && <span className="text-xs font-bold bg-slate-50 border border-slate-100 text-slate-600 px-2 py-1 rounded-md">Bask: {log.basking_temp_c}°C</span>}
                 {log.cool_temp_c !== null && <span className="text-xs font-bold bg-slate-50 border border-slate-100 text-slate-600 px-2 py-1 rounded-md">Cool: {log.cool_temp_c}°C</span>}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
