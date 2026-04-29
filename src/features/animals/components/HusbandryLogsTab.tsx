import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { queryClient } from '../../../lib/queryClient';
import { useSyncStore } from '../../../store/syncStore';
import { useAuthStore } from '../../../store/authStore';
import { Loader2, ClipboardList, Plus, Filter, Calendar, X, Save } from 'lucide-react';

const LOG_TYPES = ['ALL', 'FEED', 'WEIGHT', 'MEDICAL', 'CLEAN', 'OBSERVATION', 'ENVIRONMENT', 'OTHER'];

// --- EMBEDDED ADD LOG MODAL ---
function AddProfileLogModal({ animalId, isOpen, onClose }: { animalId: string, isOpen: boolean, onClose: () => void }) {
  const currentUserId = useAuthStore(s => s.session?.user?.id);
  const [formData, setFormData] = useState({
    log_type: 'OBSERVATION',
    log_date: new Date().toISOString().split('T')[0],
    notes: '',
    weight_grams: '',
    weight_unit: 'g',
    food: '',
    quantity: '',
    temperature_c: '',
    basking_temp_c: ''
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const uId = currentUserId || null;
      
      // Strict Schema Parsing for daily_logs
      const payload = {
        animal_id: animalId,
        log_type: formData.log_type,
        log_date: formData.log_date || new Date().toISOString().split('T')[0],
        notes: formData.notes.trim() || null,
        weight_grams: formData.weight_grams === '' ? null : Number(formData.weight_grams),
        weight_unit: formData.weight_unit,
        food: formData.food.trim() || null,
        quantity: formData.quantity === '' ? null : Number(formData.quantity),
        temperature_c: formData.temperature_c === '' ? null : Number(formData.temperature_c),
        basking_temp_c: formData.basking_temp_c === '' ? null : Number(formData.basking_temp_c),
        created_by: uId,
        modified_by: uId
      };

      const cols = Object.keys(payload);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const values = cols.map(c => payload[c as keyof typeof payload]);

      await db.query(`INSERT INTO daily_logs (${cols.join(', ')}) VALUES (${placeholders})`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_logs', 'animal', animalId] });
      useSyncStore.getState().pushToCloud().catch(console.error);
      onClose();
    },
    onError: (err: any) => alert(`Failed to save log: ${err.message}`)
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black tracking-tight text-slate-800 uppercase">Add Husbandry Log</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Log Type</label>
              <select value={formData.log_type} onChange={e => setFormData({...formData, log_type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none bg-slate-50">
                {LOG_TYPES.filter(t => t !== 'ALL').map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Date</label>
              <input type="date" value={formData.log_date} onChange={e => setFormData({...formData, log_date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none bg-slate-50" />
            </div>
          </div>

          {/* Dynamic Fields based on Log Type */}
          {formData.log_type === 'WEIGHT' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <div><label className="block text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">Weight Value</label><input type="number" value={formData.weight_grams} onChange={e => setFormData({...formData, weight_grams: e.target.value})} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm font-bold focus:outline-none" /></div>
              <div><label className="block text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">Unit</label><select value={formData.weight_unit} onChange={e => setFormData({...formData, weight_unit: e.target.value})} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm font-bold focus:outline-none"><option value="g">Grams (g)</option><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option><option value="oz">Ounces (oz)</option></select></div>
            </div>
          )}

          {formData.log_type === 'FEED' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <div><label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Food Item</label><input type="text" placeholder="e.g. Mice" value={formData.food} onChange={e => setFormData({...formData, food: e.target.value})} className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm font-bold focus:outline-none" /></div>
              <div><label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Quantity</label><input type="number" placeholder="Count/Weight" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm font-bold focus:outline-none" /></div>
            </div>
          )}

          {formData.log_type === 'ENVIRONMENT' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-100 border border-slate-200 rounded-xl">
              <div><label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Ambient Temp (°C)</label><input type="number" value={formData.temperature_c} onChange={e => setFormData({...formData, temperature_c: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:outline-none" /></div>
              <div><label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Basking Temp (°C)</label><input type="number" value={formData.basking_temp_c} onChange={e => setFormData({...formData, basking_temp_c: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:outline-none" /></div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Observational Notes</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full h-24 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:border-emerald-500 focus:outline-none bg-slate-50" placeholder="Record any relevant details..."></textarea>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-bold uppercase text-xs tracking-widest transition-colors text-slate-600">Cancel</button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Log
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN TAB COMPONENT ---
export function HusbandryLogsTab({ animalId }: { animalId: string }) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['daily_logs', 'animal', animalId],
    queryFn: async () => {
      const res = await db.query(
        "SELECT * FROM daily_logs WHERE animal_id = $1 AND is_deleted = false ORDER BY log_date DESC, created_at DESC LIMIT 100",
        [animalId]
      );
      return res.rows;
    }
  });

  const getTypeColor = (type: string) => {
    switch(type.toUpperCase()) {
      case 'FEED': return 'bg-amber-100 text-amber-800';
      case 'WEIGHT': return 'bg-blue-100 text-blue-800';
      case 'MEDICAL': return 'bg-rose-100 text-rose-800';
      case 'CLEAN': return 'bg-emerald-100 text-emerald-800';
      case 'ENVIRONMENT': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const formatMetrics = (log: any) => {
    const parts = [];
    if (log.weight_grams) parts.push(`Wt: ${log.weight_grams}${log.weight_unit || 'g'}`);
    if (log.food) parts.push(`Fed: ${log.quantity ? log.quantity + 'x ' : ''}${log.food}`);
    if (log.temperature_c) parts.push(`Temp: ${log.temperature_c}°C`);
    if (log.basking_temp_c) parts.push(`Bask: ${log.basking_temp_c}°C`);
    return parts.length > 0 ? parts.join(' | ') : '-';
  };

  const filteredLogs = activeFilter === 'ALL' ? logs : logs.filter(l => l.log_type.toUpperCase() === activeFilter);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  return (
    <div className="space-y-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
         <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ClipboardList size={20}/></div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Husbandry History</h3>
         </div>
         <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2">
           <Plus size={16}/> Add Log
         </button>
      </div>

      {/* Filter Bar */}
      <div className="flex overflow-x-auto scrollbar-hide bg-slate-100 p-1.5 rounded-xl gap-1 border border-slate-200">
        {LOG_TYPES.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveFilter(tab)} 
            className={`flex-1 min-w-fit px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${activeFilter === tab ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Date</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Type</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Metrics</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-medium text-sm">
                    No logs found for this filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Calendar size={12} className="text-slate-400"/> {new Date(log.log_date).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-[9px] font-black uppercase rounded tracking-widest ${getTypeColor(log.log_type)}`}>{log.log_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-slate-700">{formatMetrics(log)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-slate-600 whitespace-pre-wrap max-w-xl">{log.notes || '-'}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddProfileLogModal animalId={animalId} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}",
  "Overwrite": true,
  "toolAction": "Overwriting HusbandryLogsTab to deploy data table and modal",
  "toolSummary": "Husbandry Tab overhaul"
}
