import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { queryClient } from '../../../lib/queryClient';
import { useSyncStore } from '../../../store/syncStore';
import { useAuthStore } from '../../../store/authStore';
import { Loader2, ClipboardList, Plus, Calendar, Clock, X, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const LOG_TYPES = ['ALL', 'FEED', 'WEIGHT', 'TEMPERATURE', 'EVENTS', 'TRAINING', 'FLYING', 'GENERAL'];

// --- EMBEDDED ADD LOG MODAL ---
function AddProfileLogModal({ animalId, isOpen, onClose }: { animalId: string, isOpen: boolean, onClose: () => void }) {
  const currentUserId = useAuthStore(s => s.session?.user?.id);
  const [formData, setFormData] = useState({
    log_type: 'GENERAL',
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
      toast.success('Husbandry log added successfully');
      onClose();
    },
    onError: (err: any) => toast.error(`Failed to save log: ${err.message}`)
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

          {formData.log_type === 'TEMPERATURE' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 border border-purple-100 rounded-xl">
              <div><label className="block text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1">Ambient Temp (°C)</label><input type="number" value={formData.temperature_c} onChange={e => setFormData({...formData, temperature_c: e.target.value})} className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm font-bold focus:outline-none" /></div>
              <div><label className="block text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1">Basking Temp (°C)</label><input type="number" value={formData.basking_temp_c} onChange={e => setFormData({...formData, basking_temp_c: e.target.value})} className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm font-bold focus:outline-none" /></div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Log Notes / Details</label>
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
  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['daily_logs', 'animal', animalId],
    queryFn: async () => {
      const res = await db.query(
        `SELECT d.*, u.initials as user_initials 
         FROM daily_logs d 
         LEFT JOIN users u ON d.modified_by = u.id 
         WHERE d.animal_id = $1 AND d.is_deleted = false 
         ORDER BY d.log_date DESC, d.created_at DESC LIMIT 100`,
        [animalId]
      );
      return res.rows;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (logId: string) => {
      const uId = currentUserId || null;
      await db.query(
        `UPDATE daily_logs SET is_deleted = true, modified_by = $1, updated_at = now() WHERE id = $2`,
        [uId, logId]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_logs', 'animal', animalId] });
      toast.success('Log successfully voided.');
    },
    onError: (err: any) => toast.error(`Failed to void log: ${err.message}`)
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to void this log? This cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const getTypeColor = (type: string) => {
    switch(type.toUpperCase()) {
      case 'FEED': return 'bg-amber-100 text-amber-800';
      case 'WEIGHT': return 'bg-blue-100 text-blue-800';
      case 'TEMPERATURE': return 'bg-purple-100 text-purple-800';
      case 'EVENTS': return 'bg-rose-100 text-rose-800';
      case 'TRAINING': return 'bg-indigo-100 text-indigo-800';
      case 'FLYING': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const formatMetrics = (log: any) => {
    const parts = [];
    const logType = String(log.log_type).toUpperCase();
    
    const parseNum = (val: any) => {
        if (val === null || val === undefined || val === '') return null;
        const n = Number(val);
        return (isNaN(n) || n === -1) ? null : n;
    };

    if (logType === 'WEIGHT') {
        const wt = parseNum(log.weight_grams);
        if (wt !== null) parts.push(`Wt: ${wt}${log.weight_unit || 'g'}`);
    }
    if (logType === 'FEED') {
        if (log.food && log.food !== 'N/A' && log.food !== 'NONE') {
            const qty = parseNum(log.quantity);
            parts.push(`Fed: ${qty !== null ? qty + 'x ' : ''}${log.food}`);
        }
    }
    if (logType === 'TEMPERATURE') {
        const tc = parseNum(log.temperature_c);
        const btc = parseNum(log.basking_temp_c);
        if (tc !== null) parts.push(`Ambient: ${tc}°C`);
        if (btc !== null) parts.push(`Basking: ${btc}°C`);
    }
    return parts.length > 0 ? parts.join(' | ') : '-';
  };

  const filteredLogs = activeFilter === 'ALL' ? logs : logs.filter(l => l.log_type.toUpperCase() === activeFilter);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
         <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ClipboardList size={20}/></div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Husbandry History</h3>
         </div>
         <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2">
           <Plus size={16}/> Add Log
         </button>
      </div>

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
      
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Date</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">Time</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">Initials</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Type</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Metrics</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Notes</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-medium text-sm">
                    No logs found for this filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const timeStr = log.log_type === 'FEED' && log.feed_time && log.feed_time !== '00:00:00' 
                    ? log.feed_time.substring(0, 5) 
                    : new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Calendar size={12} className="text-slate-400"/> {new Date(log.log_date).toLocaleDateString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Clock size={12} className="text-slate-400"/> {timeStr}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">{log.user_initials || '??'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-[9px] font-black uppercase rounded tracking-widest ${getTypeColor(log.log_type)}`}>{log.log_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-slate-700">{formatMetrics(log)}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate hover:whitespace-normal hover:break-words">
                        <p className="text-xs font-medium text-slate-600">{log.notes || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleDelete(log.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Void Log"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddProfileLogModal animalId={animalId} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
