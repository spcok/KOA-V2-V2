import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';
import { 
  Utensils, Calendar, ChevronLeft, ChevronRight, CheckCircle2, 
  Trash2, Loader2, Plus, Info, ShieldAlert, History, Edit2, X
} from 'lucide-react';

const CATEGORIES = ['All', 'Owl', 'Raptor', 'Mammal', 'Exotic', 'Other'];

export function FeedingScheduleView() {
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  
  const [animalId, setAnimalId] = useState('');
  const [foodType, setFoodType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [calciDust, setCalciDust] = useState(false);
  const [notes, setNotes] = useState('');
  
  const [mode, setMode] = useState<'single' | 'interval'>('single');
  const [intervalDays, setIntervalDays] = useState(1);
  const [occurrences, setOccurrences] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);

  const session = useAuthStore((state) => state.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
  // UUID Sanitize: Prevent Postgres Foreign Key Violations
  const safeUserId = currentUserId === '00000000-0000-0000-0000-000000000000' ? null : currentUserId;

  const { data, isLoading } = useQuery({
    queryKey: ['feeding_schedules', viewDate, selectedCategory],
    queryFn: async () => {
      let animalQuery = "SELECT id, name, category, entity_type FROM animals WHERE is_deleted = false";
      const params: any[] = [];
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'Other') {
            animalQuery += " AND category NOT ILIKE '%Owl%' AND category NOT ILIKE '%Raptor%' AND category NOT ILIKE '%Mammal%' AND category NOT ILIKE '%Exotic%'";
        } else {
            animalQuery += ` AND category ILIKE $1`;
            params.push(`%${selectedCategory}%`);
        }
      }
      animalQuery += " ORDER BY name ASC";
      const animalRes = await db.query(animalQuery, params);

      const scheduleRes = await db.query(
        "SELECT * FROM feeding_schedules WHERE scheduled_date = $1 AND is_deleted = false ORDER BY created_at DESC",
        [viewDate]
      );

      const animalMap = new Map(animalRes.rows.map(a => [a.id, a]));
      const enrichedSchedules = scheduleRes.rows.map(s => ({
        ...s,
        animal: animalMap.get(s.animal_id) || { name: 'Unknown Animal', category: 'Unknown' }
      }));

      const filteredSchedules = selectedCategory === 'All' 
        ? enrichedSchedules 
        : enrichedSchedules.filter(s => {
            const cat = s.animal.category || '';
            if (selectedCategory === 'Other') {
                return !['Owl', 'Raptor', 'Mammal', 'Exotic'].some(c => cat.toLowerCase().includes(c.toLowerCase()));
            }
            return cat.toLowerCase().includes(selectedCategory.toLowerCase());
        });

      return { animals: animalRes.rows, schedules: filteredSchedules };
    }
  });

  const animals = data?.animals || [];
  const schedules = data?.schedules || [];
  const completedCount = schedules.filter(s => s.is_completed).length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      await db.transaction(async (tx) => {
        if (editId) {
          await tx.query(
            `UPDATE feeding_schedules SET animal_id=$1, food_type=$2, quantity=$3, calci_dust=$4, additional_notes=$5, modified_by=$6, updated_at=now() WHERE id=$7`,
            [animalId, foodType, Number(quantity) || 0, calciDust, notes, safeUserId, editId]
          );
        } else {
          const datesToSchedule: string[] = [];
          if (mode === 'single') {
            datesToSchedule.push(viewDate);
          } else {
            for (let i = 0; i < occurrences; i++) {
              const d = new Date(viewDate);
              d.setDate(d.getDate() + (i * intervalDays));
              datesToSchedule.push(d.toISOString().split('T')[0]);
            }
          }
          for (const date of datesToSchedule) {
            await tx.query(
              `INSERT INTO feeding_schedules (animal_id, scheduled_date, food_type, quantity, calci_dust, additional_notes, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
              [animalId, date, foodType, Number(quantity) || 0, calciDust, notes, safeUserId]
            );
          }
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(); 
      useSyncStore.getState().pushToCloud().catch(console.error);
      cancelEdit();
    },
    onError: (err) => alert(`Save failed: ${err.message}`)
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.query(
        `UPDATE feeding_schedules SET is_completed = true, completed_at = now(), completed_by = $1, updated_at = now(), modified_by = $1 WHERE id = $2`,
        [safeUserId, id]
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      useSyncStore.getState().pushToCloud().catch(console.error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.query(`UPDATE feeding_schedules SET is_deleted = true, updated_at = now(), modified_by = $1 WHERE id = $2`, [safeUserId, id]);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(); 
      useSyncStore.getState().pushToCloud().catch(console.error);
    },
    onError: (err) => alert(`Delete failed: ${err.message}`)
  });

  const startEdit = (schedule: any) => {
    setEditId(schedule.id);
    setAnimalId(schedule.animal_id);
    setFoodType(schedule.food_type);
    setQuantity(String(schedule.quantity));
    setCalciDust(schedule.calci_dust);
    setNotes(schedule.additional_notes || '');
    setMode('single');
  };

  const cancelEdit = () => {
    setEditId(null);
    setAnimalId(''); setFoodType(''); setQuantity(''); setCalciDust(false); setNotes('');
  };

  const changeDate = (days: number) => {
    const d = new Date(viewDate); d.setDate(d.getDate() + days);
    setViewDate(d.toISOString().split('T')[0]);
  };

  const isFormValid = animalId && foodType && quantity;

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative pb-20">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-6 shadow-sm z-10 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Utensils className="text-amber-500" size={28} /> Feeding Schedules
            </h1>
            <div className="flex items-center gap-1 mt-3 bg-slate-50 border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
              <button onClick={() => changeDate(-1)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md"><ChevronLeft size={16} /></button>
              <div className="flex items-center gap-2 px-3 border-x border-slate-200">
                <Calendar size={14} className="text-slate-400" />
                <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none" />
              </div>
              <button onClick={() => changeDate(1)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
        
        <div className="flex overflow-x-auto scrollbar-hide bg-slate-100 p-1.5 rounded-xl gap-1 mt-6">
          {CATEGORIES.map(tab => (
            <button key={tab} onChange={() => {}} onClick={() => { setSelectedCategory(tab); setAnimalId(''); }} className={`flex-1 min-w-fit px-4 py-2 text-sm font-bold rounded-lg transition-colors ${selectedCategory === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-colors ${editId ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                {editId ? <Edit2 className="text-amber-500" size={18}/> : <Plus className="text-emerald-500" size={18}/>} 
                {editId ? 'Edit Feed' : 'Plan Feed'}
              </h2>
              {editId && <button onClick={cancelEdit} className="text-slate-400 hover:text-rose-500"><X size={18}/></button>}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Select Animal</label>
                <select value={animalId} onChange={e => setAnimalId(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500">
                  <option value="">-- Choose Animal --</option>
                  {animals.map(a => <option key={a.id} value={a.id}>{a.name} ({a.entity_type})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Food Type</label>
                  <input type="text" placeholder="e.g. Mice" value={foodType} onChange={e => setFoodType(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Quantity</label>
                  <input type="number" placeholder="Count/Weight" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input type="checkbox" checked={calciDust} onChange={e => setCalciDust(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500" id="calci" />
                <label htmlFor="calci" className="text-sm font-bold text-slate-700 select-none">Apply Calci-Dust / Supplement</label>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Notes (Optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Preparation instructions..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 min-h-[60px]" />
              </div>

              <div className="border-t border-slate-100 pt-4">
                {!editId && (
                  <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                    <button onClick={() => setMode('single')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${mode === 'single' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Single Day</button>
                    <button onClick={() => setMode('interval')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${mode === 'interval' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Interval Plan</button>
                  </div>
                )}

                {mode === 'interval' && !editId && (
                  <div className="grid grid-cols-2 gap-3 mb-4 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                    <div>
                      <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Every (Days)</label>
                      <input type="number" min="1" value={intervalDays} onChange={e => setIntervalDays(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-amber-900 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Occurrences</label>
                      <input type="number" min="2" value={occurrences} onChange={e => setOccurrences(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-amber-900 focus:outline-none" />
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => saveMutation.mutate()} 
                  disabled={!isFormValid || saveMutation.isPending}
                  className={`w-full py-3 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${editId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                >
                  {saveMutation.isPending ? <Loader2 size={16} className="animate-spin"/> : editId ? <Edit2 size={16}/> : <Plus size={16}/>}
                  {editId ? 'Update Schedule' : mode === 'interval' ? `Schedule ${occurrences} Feeds` : 'Add to Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <History className="text-slate-400" size={18}/> {new Date(viewDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </h2>
              </div>
              <div className="text-xs font-bold text-slate-500">
                <span className="text-emerald-600">{completedCount}</span> / {schedules.length} Completed
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto bg-slate-50/30">
              {isLoading ? (
                 <div className="flex justify-center items-center h-full"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>
              ) : schedules.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                    <Utensils size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-bold text-slate-600">No feeds scheduled.</p>
                    <p className="text-xs text-slate-500 mt-1">Use the planning engine to add tasks for this date.</p>
                 </div>
              ) : (
                 <div className="space-y-3">
                   {schedules.map(schedule => (
                     <div key={schedule.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${schedule.is_completed ? 'bg-emerald-50/50 border-emerald-100 opacity-75' : 'bg-white border-slate-200 shadow-sm hover:border-amber-200'}`}>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between mb-1">
                             <h3 className="font-black text-slate-800 text-sm sm:text-base truncate uppercase">{schedule.animal.name}</h3>
                             {schedule.calci_dust && <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1"><ShieldAlert size={10}/> Calci</span>}
                           </div>
                           <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                             {schedule.quantity}x {schedule.food_type}
                           </p>
                           {schedule.additional_notes && <p className="text-[10px] font-medium text-slate-500 mt-1 truncate">{schedule.additional_notes}</p>}
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0 border-l border-slate-100 pl-4">
                           {schedule.is_completed ? (
                              <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600">
                                 <CheckCircle2 size={20} />
                              </div>
                           ) : (
                              <>
                                <button onClick={() => completeMutation.mutate(schedule.id)} className="flex flex-col items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                   <CheckCircle2 size={18} />
                                </button>
                                <button onClick={() => startEdit(schedule)} className="flex flex-col items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                   <Edit2 size={16} />
                                </button>
                              </>
                           )}
                           <button onClick={() => window.confirm('Delete this feed?') && deleteMutation.mutate(schedule.id)} className="flex flex-col items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                              <Trash2 size={18} />
                           </button>
                        </div>
                     </div>
                   ))}
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
