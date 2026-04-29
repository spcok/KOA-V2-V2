import React, { useState, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { db } from '../../../lib/db';
import { useSyncStore } from '../../../store/syncStore';
import { queryClient } from '../../../lib/queryClient';
import { useAuthStore } from '../../../store/authStore';
import { useMutation } from '@tanstack/react-query';
import { X, Trash2, Save, Loader2, User } from 'lucide-react';
import { convertToGrams, convertFromGrams } from '../../../lib/weightUtils';

const LOG_TYPES = [
  "weight", "feed", "temperature", "misting", "events", "flight", "water", "training", "general"
];

const formSchema = z.object({
  log_type: z.enum(LOG_TYPES as [string, ...string[]]),
  log_date: z.string(),
  notes: z.string().nullable().optional(),
  weight_grams: z.union([z.number(), z.string()]).nullable().optional(),
  weight_unit: z.enum(['g', 'kg', '-1', 'lb', 'oz', 'lbs_oz']).nullable().optional(),
  weightValues: z.object({
    g: z.number(),
    lb: z.number(),
    oz: z.number(),
    eighths: z.number()
  }).optional(),
  basking_temp_c: z.union([z.number(), z.string()]).nullable().optional(),
  cool_temp_c: z.union([z.number(), z.string()]).nullable().optional(),
  temperature_c: z.union([z.number(), z.string()]).nullable().optional(),
  food: z.string().nullable().optional(),
  quantity: z.union([z.number(), z.string()]).nullable().optional(),
  feed_time: z.string().nullable().optional(),
  feed_method: z.string().nullable().optional(),
  cast_status: z.string().nullable().optional(),
  misted: z.string().nullable().optional(),
  water: z.string().nullable().optional(),
});

interface DailyLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  animalId: string;
  existingLogId?: string;
  initialType?: string;
}

export function DailyLogModal(props: DailyLogModalProps) {
  const [isFetching, setIsFetching] = useState(!!props.existingLogId);
  const [animalUnit, setAnimalUnit] = useState('g');
  const [initialData, setInitialData] = useState({
    log_type: (props.initialType || 'general') as any,
    log_date: new Date().toISOString().slice(0, 16),
    notes: '',
    modifier_initials: '',
    weight_grams: "" as any,
    weight_unit: '-1',
    weightValues: { g: 0, lb: 0, oz: 0, eighths: 0 },
    basking_temp_c: "" as any,
    cool_temp_c: "" as any,
    temperature_c: "" as any,
    food: '',
    quantity: '',
    feed_time: '',
    feed_method: '',
    cast_status: 'N/A',
    misted: '',
    water: '',
  });

  useEffect(() => {
    async function fetchData() {
      setIsFetching(true);
      let fetchedUnit = 'g';
      const animalRes = await db.query('SELECT weight_unit FROM animals WHERE id = $1', [props.animalId]);
      if (animalRes.rows.length > 0) {
        fetchedUnit = animalRes.rows[0].weight_unit || 'g';
        setAnimalUnit(fetchedUnit);
      }

      if (props.existingLogId && props.isOpen) {
        const res = await db.query(`
          SELECT dl.*, u.initials as modifier_initials 
          FROM daily_logs dl 
          LEFT JOIN users u ON dl.modified_by = u.id 
          WHERE dl.id = $1
        `, [props.existingLogId]);
        
        if (res.rows[0]) {
          const row = res.rows[0];
          const parsedDate = row.log_date ? new Date(row.log_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
          const weight = row.weight_grams === -1 ? 0 : row.weight_grams;
          const logUnit = row.weight_unit && row.weight_unit !== '-1' ? row.weight_unit : fetchedUnit;
          const targetUnit = logUnit === 'lbs_oz' ? 'lb' : (logUnit === 'oz' ? 'oz' : 'g');

          setInitialData({
            log_type: row.log_type,
            log_date: parsedDate,
            notes: row.notes === 'NONE' ? '' : (row.notes || ''),
            modifier_initials: row.modifier_initials || '',
            weight_grams: row.weight_grams === -1 ? "" : row.weight_grams,
            weight_unit: logUnit,
            weightValues: convertFromGrams(weight, targetUnit),
            basking_temp_c: row.basking_temp_c === -1 ? "" : row.basking_temp_c,
            cool_temp_c: row.cool_temp_c === -1 ? "" : row.cool_temp_c,
            temperature_c: row.temperature_c === -1 ? "" : row.temperature_c,
            food: row.food === 'N/A' ? "" : row.food,
            quantity: row.quantity === -1 ? "" : row.quantity,
            feed_time: row.feed_time === '00:00:00' ? "" : row.feed_time,
            feed_method: row.feed_method === 'N/A' ? "" : row.feed_method,
            cast_status: row.cast_status,
            misted: row.misted === 'N/A' ? "" : row.misted,
            water: row.water === 'N/A' ? "" : row.water,
          });
        }
      }
      setIsFetching(false);
    }
    if (props.isOpen) {
      fetchData();
    }
  }, [props.existingLogId, props.isOpen, props.animalId]);

  if (!props.isOpen) return null;
  if (isFetching) return <div className="fixed inset-0 bg-slate-900/80 flex justify-center items-center z-50 text-emerald-400 font-mono">Loading data from vault...</div>;

  return <DailyLogForm {...props} initialData={initialData} animalUnit={animalUnit} />;
}

function DailyLogForm({ isOpen, onClose, animalId, existingLogId, initialData, animalUnit }: DailyLogModalProps & { initialData: any, animalUnit: string }) {
  const [logType, setLogType] = useState(initialData.log_type);
  const targetUnit = animalUnit === 'lbs_oz' ? 'lb' : (animalUnit === 'oz' ? 'oz' : 'g');

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const session = useAuthStore.getState().session;
      const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
      await db.query('UPDATE daily_logs SET is_deleted = true, updated_at = NOW(), modified_by = $1 WHERE id = $2', [currentUserId, id]);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      useSyncStore.getState().pushToCloud().catch(console.error);
      onClose();
    },
    onError: (err) => {
      console.error('CRITICAL SQL ERROR:', err);
      alert('Database Error: Failed to delete log.');
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { value, finalAnimalId, currentUserId, zeroUUID } = payload;
      
      const finalLogType = value.log_type || 'general';
      const finalDate = value.log_date || new Date().toISOString().slice(0, 16);
      const finalNotes = value.notes ? String(value.notes).trim() : 'NONE';
      const finalUnit = value.weight_unit && value.weight_unit !== '-1' ? value.weight_unit : animalUnit;
      const num = (v: any) => (v === "" || v === undefined || v === null || isNaN(Number(v))) ? -1 : Number(v);
      
      const finalWeight = num(value.weight_grams);
      const finalBasking = num(value.basking_temp_c);
      const finalCool = num(value.cool_temp_c);
      const finalTemp = num(value.temperature_c);
      const finalFood = value.food ? String(value.food).trim() : 'N/A';
      const finalQuantity = num(value.quantity);
      const finalFeedTime = value.feed_time ? String(value.feed_time) : '00:00:00';
      const finalFeedMethod = value.feed_method ? String(value.feed_method).trim() : 'N/A';
      const finalCast = value.cast_status || 'N/A';
      const finalMisted = value.misted ? String(value.misted).trim() : 'N/A';
      const finalWater = value.water ? String(value.water).trim() : 'N/A';

      if (existingLogId) {
        const params = [finalLogType, finalDate, finalNotes, finalWeight, finalUnit, finalBasking, finalCool, finalTemp, finalFood, finalQuantity, finalFeedTime, finalFeedMethod, finalCast, finalMisted, finalWater, currentUserId, existingLogId];
        await db.query(
          `UPDATE daily_logs SET log_type = $1, log_date = $2, notes = $3, weight_grams = $4, weight_unit = $5, basking_temp_c = $6, cool_temp_c = $7, temperature_c = $8, food = $9, quantity = $10, feed_time = $11, feed_method = $12, cast_status = $13, misted = $14, water = $15, updated_at = now(), modified_by = $16 WHERE id = $17`,
          params
        );
      } else {
        const params = [finalAnimalId, finalLogType, finalDate, finalNotes, finalWeight, finalUnit, finalBasking, finalCool, finalTemp, finalFood, finalQuantity, finalFeedTime, finalFeedMethod, finalCast, finalMisted, finalWater, currentUserId, currentUserId];
        await db.query(
          `INSERT INTO daily_logs (animal_id, log_type, log_date, notes, weight_grams, weight_unit, basking_temp_c, cool_temp_c, temperature_c, food, quantity, feed_time, feed_method, cast_status, misted, water, created_at, updated_at, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now(), now(), $17, $18)`,
          params
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      useSyncStore.getState().pushToCloud().catch(console.error);
      onClose();
    },
    onError: (err) => {
      console.error('CRITICAL SQL ERROR:', err);
      alert('Database Error: Failed to save log.');
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: initialData,
    onSubmit: async ({ value }) => {
      const session = useAuthStore.getState().session;
      const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
      const finalAnimalId = animalId || '00000000-0000-0000-0000-000000000000';
      const zeroUUID = '00000000-0000-0000-0000-000000000000';
      
      saveMutation.mutate({ value, finalAnimalId, currentUserId, zeroUUID });
    },
  });

  const handleDelete = () => {
    if (!existingLogId) return;
    if (window.confirm('Are you sure you want to delete this log?')) {
      deleteMutation.mutate(existingLogId);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black tracking-tight text-slate-800">{existingLogId ? 'Edit Record' : 'New Record'}</h2>
            {existingLogId && initialData.modifier_initials && (
               <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-md uppercase tracking-wider border border-blue-100">
                 <User size={12} /> Last modified by: {initialData.modifier_initials}
               </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 scrollbar-hide">
          <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="log_date" children={(field) => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Date</label>
                  <input type="datetime-local" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              )} />
              <form.Field name="log_type" children={(field) => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Type</label>
                  <select name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => {
                    const val = e.target.value;
                    field.handleChange(val as any);
                    setLogType(val);
                  }} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500 capitalize">
                    {LOG_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              )} />
            </div>
            
            <>
              {logType === 'weight' && (
                <form.Field name="weightValues" children={(field) => {
                  const handleWeightChange = (subField: string, val: string) => {
                    const num = val === '' ? 0 : parseInt(val, 10);
                    const newValues = { ...(field.state.value || {g:0, lb:0, oz:0, eighths:0}), [subField]: num };
                    field.handleChange(newValues);
                    const totalGrams = convertToGrams(targetUnit, newValues);
                    form.setFieldValue('weight_grams', totalGrams);
                  };

                  return (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-700 mb-3">Current Weight ({targetUnit})</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                         {targetUnit === 'g' && (
                           <div className="sm:col-span-3">
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Grams</label>
                              <input type="number" value={field.state.value?.g || ''} onChange={(e) => handleWeightChange('g', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 1050" />
                           </div>
                         )}
                         {(targetUnit === 'lb' || targetUnit === 'oz') && (
                           <>
                              {targetUnit === 'lb' && (
                                 <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pounds</label>
                                    <input type="number" value={field.state.value?.lb || ''} onChange={(e) => handleWeightChange('lb', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500" />
                                 </div>
                              )}
                              <div className={targetUnit === 'oz' ? "sm:col-span-2" : ""}>
                                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ounces</label>
                                 <input type="number" value={field.state.value?.oz || ''} onChange={(e) => handleWeightChange('oz', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500" />
                              </div>
                              <div>
                                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Eighths</label>
                                 <select value={field.state.value?.eighths || 0} onChange={(e) => handleWeightChange('eighths', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500">
                                    {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}/8</option>)}
                                 </select>
                              </div>
                           </>
                         )}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 italic mt-3 bg-slate-100 p-2 rounded inline-block border border-slate-200">Database Value: {convertToGrams(targetUnit, field.state.value || {g:0, lb:0, oz:0, eighths:0})}g</p>
                    </div>
                  );
                }} />
              )}
              {['temperature'].includes(logType) && (
                <form.Field name="temperature_c" children={(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Temperature (°C)</label>
                    <input type="number" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => { const val = e.target.valueAsNumber; field.handleChange(isNaN(val) ? "" : val); }} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                )} />
              )}
              {['feed'].includes(logType) && (
                <div className="space-y-4">
                    <form.Field name="food" children={(field) => (
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Food</label>
                        <input name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500" />
                      </div>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <form.Field name="quantity" children={(field) => (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Quantity</label>
                          <input type="number" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => { const val = e.target.valueAsNumber; field.handleChange(isNaN(val) ? "" : val); }} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500" />
                        </div>
                      )} />
                      <form.Field name="feed_time" children={(field) => (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Time</label>
                          <input type="time" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500" />
                        </div>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <form.Field name="feed_method" children={(field) => (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Method</label>
                          <input name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500" />
                        </div>
                      )} />
                      <form.Field name="cast_status" children={(field) => (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Cast Status</label>
                          <select name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500">
                            <option value="N/A">N/A</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                      )} />
                    </div>
                </div>
              )}
              {['misting'].includes(logType) && (
                <form.Field name="misted" children={(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Misted</label>
                    <select name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500">
                      <option value="N/A">N/A</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                )} />
              )}
              {['water'].includes(logType) && (
                <form.Field name="water" children={(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Water Changed</label>
                    <select name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500">
                      <option value="N/A">N/A</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                )} />
              )}
              
              <form.Field name="notes" children={(field) => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Notes (Optional)</label>
                  <textarea name={field.name} value={field.state.value || ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 min-h-[80px]" />
                </div>
              )} />
            </>
          </form>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-3 shrink-0">
          {existingLogId ? (
            <button type="button" onClick={handleDelete} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors flex items-center gap-2" disabled={saveMutation.isPending || deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete
            </button>
          ) : <div></div>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors">Cancel</button>
            <button type="button" onClick={() => form.handleSubmit()} disabled={saveMutation.isPending || deleteMutation.isPending} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-colors flex items-center gap-2">
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
