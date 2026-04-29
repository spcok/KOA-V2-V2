import React, { useState, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { queryClient } from '../../../lib/queryClient';
import { useSyncStore } from '../../../store/syncStore';
import { useAuthStore } from '../../../store/authStore';
import { X, Save, Loader2, Trash2 } from 'lucide-react';

const roundSchema = z.object({
  round_date: z.string(),
  round_time: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  notes: z.string().optional(),
});

export function RoundModal({ isOpen, onClose, existingRoundId }: { isOpen: boolean, onClose: () => void, existingRoundId?: string }) {
  const [initialData, setInitialData] = useState({
    round_date: new Date().toISOString().split('T')[0],
    round_time: new Date().toTimeString().slice(0, 5),
    status: 'pending' as any,
    notes: ''
  });
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (existingRoundId && isOpen) {
      setIsFetching(true);
      db.query('SELECT * FROM daily_rounds WHERE id = $1', [existingRoundId]).then(res => {
        if (res.rows[0]) {
          const r = res.rows[0];
          setInitialData({ round_date: r.round_date, round_time: r.round_time, status: r.status, notes: r.notes || '' });
        }
        setIsFetching(false);
      });
    }
  }, [existingRoundId, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async (value: any) => {
      const session = useAuthStore.getState().session;
      const uid = session?.user?.id || '00000000-0000-0000-0000-000000000000';
      
      if (existingRoundId) {
        await db.query(`UPDATE daily_rounds SET round_date=$1, round_time=$2, status=$3, notes=$4, updated_at=now(), modified_by=$5 WHERE id=$6`,
          [value.round_date, value.round_time, value.status, value.notes, uid, existingRoundId]);
      } else {
        await db.query(`INSERT INTO daily_rounds (round_date, round_time, status, notes, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $5)`,
          [value.round_date, value.round_time, value.status, value.notes, uid]);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['daily_rounds'] });
      useSyncStore.getState().pushToCloud().catch(console.error);
      onClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await db.query(`UPDATE daily_rounds SET is_deleted = true, updated_at = now() WHERE id = $1`, [existingRoundId]);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['daily_rounds'] });
      useSyncStore.getState().pushToCloud().catch(console.error);
      onClose();
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: initialData,
    onSubmit: async ({ value }) => saveMutation.mutate(value),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black tracking-tight text-slate-800">{existingRoundId ? 'Edit Round' : 'New Round'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>
        
        {isFetching ? (
          <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>
        ) : (
          <div className="p-6">
            <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <form.Field name="round_date" children={(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Date</label>
                    <input type="date" value={field.state.value} onBlur={field.handleBlur} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                )} />
                <form.Field name="round_time" children={(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Time</label>
                    <input type="time" value={field.state.value} onBlur={field.handleBlur} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                )} />
              </div>
              <form.Field name="status" children={(field) => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</label>
                  <select value={field.state.value} onBlur={field.handleBlur} onChange={e => field.handleChange(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              )} />
              <form.Field name="notes" children={(field) => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Notes</label>
                  <textarea value={field.state.value || ''} onBlur={field.handleBlur} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm min-h-[80px]" />
                </div>
              )} />
            </form>
          </div>
        )}

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-3">
          {existingRoundId ? (
            <button onClick={() => window.confirm('Delete round?') && deleteMutation.mutate()} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold uppercase text-xs transition-colors flex items-center gap-2"><Trash2 size={16}/></button>
          ) : <div/>}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold uppercase text-xs transition-colors">Cancel</button>
            <button onClick={() => form.handleSubmit()} disabled={saveMutation.isPending} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase text-xs transition-colors flex items-center gap-2">
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
