import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, Plus, X, Flame } from 'lucide-react';
import toast from 'react-hot-toast';

const drillSchema = z.object({
  drill_date: z.string().min(1, "Date required"),
  drill_type: z.enum(['PLANNED', 'UNPLANNED', 'FALSE_ALARM']).default('PLANNED'),
  areas_involved: z.string().min(1, "Areas involved required").default('WHOLE_SITE'),
  evacuation_duration: z.string().regex(/^\d{2}:\d{2}$/, "Must be MM:SS format").default('00:00'),
  roll_call_completed: z.boolean().default(false),
  issues_observed: z.string().default('NONE'),
  corrective_actions: z.string().default('NONE'),
  status: z.enum(['PASS', 'REQUIRES_ACTION', 'RESOLVED']).default('PASS'),
  conducted_by: z.string().nullable().transform(val => val === '' || !val ? null : val),
});

export function FireDrillView() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const { data, isLoading } = useQuery({
    queryKey: ['fire_drills'],
    queryFn: async () => {
      const usersRes = await db.query("SELECT id, name, email FROM users WHERE is_deleted = false");
      const drillsRes = await db.query(`SELECT f.*, u.name as conductor_name FROM fire_drill_logs f LEFT JOIN users u ON f.conducted_by = u.id WHERE f.is_deleted = false ORDER BY f.drill_date DESC`);
      return { users: usersRes.rows, drills: drillsRes.rows };
    }
  });

  const form = useForm({
    defaultValues: { drill_date: new Date().toISOString().slice(0, 16), drill_type: 'PLANNED', areas_involved: 'WHOLE_SITE', evacuation_duration: '00:00', roll_call_completed: false, issues_observed: '', corrective_actions: '', status: 'PASS', conducted_by: currentUserId || '' },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      const p: any = drillSchema.parse(value);
      try {
        await db.query(
          `INSERT INTO fire_drill_logs (drill_date, drill_type, areas_involved, evacuation_duration, roll_call_completed, issues_observed, corrective_actions, status, conducted_by, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
          [p.drill_date, p.drill_type, p.areas_involved, p.evacuation_duration, p.roll_call_completed, p.issues_observed, p.corrective_actions, p.status, p.conducted_by, currentUserId]
        );
        queryClient.invalidateQueries({ queryKey: ['fire_drills'] });
        setIsModalOpen(false);
        toast.success('Fire Drill Logged');
      } catch (err: any) { toast.error(err.message); }
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><Flame className="text-orange-500" size={28}/> Fire Drill Logs</h1>
        <button onClick={() => { form.reset(); setIsModalOpen(true); }} className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-black uppercase text-xs shadow-lg"><Plus size={16} className="inline"/> Log Drill</button>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead><tr className="bg-slate-50 border-b"><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Date / Type</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Clear Time</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Roll Call</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Status</th></tr></thead>
          <tbody className="divide-y">
            {data?.drills.map((d: any) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><p className="font-bold text-sm text-slate-800">{new Date(d.drill_date).toLocaleString()}</p><span className="text-[10px] font-black text-slate-400 uppercase">{d.drill_type.replace('_', ' ')} - {d.areas_involved}</span></td>
                <td className="px-4 py-3 font-mono font-bold text-slate-700">{d.evacuation_duration}</td>
                <td className="px-4 py-3">{d.roll_call_completed ? <span className="text-emerald-600 font-bold text-xs">Complete</span> : <span className="text-rose-600 font-bold text-xs">Failed</span>}</td>
                <td className="px-4 py-3"><span className={`text-[9px] font-black uppercase border px-2 py-1 rounded-md ${d.status === 'PASS' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{d.status.replace('_', ' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-center p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl my-auto flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b"><h2 className="text-lg font-black uppercase">Log Evacuation Drill</h2><button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-700"/></button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <form.Field name="drill_date">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Date & Time</label><input type="datetime-local" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field>
                 <form.Field name="drill_type">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Type</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="PLANNED">Planned Drill</option><option value="UNPLANNED">Unplanned Drill</option><option value="FALSE_ALARM">False Alarm</option></select></div>)}</form.Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                 <form.Field name="evacuation_duration">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Clear Time (MM:SS)</label><input placeholder="03:45" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-mono font-bold bg-slate-50" /></div>)}</form.Field>
                 <form.Field name="areas_involved">{field => (<div className="col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase">Areas Evacuated</label><input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field>
              </div>
              <div className="flex gap-4 p-4 bg-orange-50 rounded-xl">
                 <form.Field name="roll_call_completed">{field => (<label className="flex items-center gap-2 text-sm font-bold text-orange-900"><input type="checkbox" checked={field.state.value} onChange={e => field.handleChange(e.target.checked)} className="rounded text-orange-600" /> Site Roll Call Completed Successfully?</label>)}</form.Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <form.Field name="issues_observed">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Issues Observed</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
                 <form.Field name="corrective_actions">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Corrective Actions</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <form.Field name="status">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Drill Status</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="PASS">Pass</option><option value="REQUIRES_ACTION">Requires Action</option><option value="RESOLVED">Issues Resolved</option></select></div>)}</form.Field>
                 <form.Field name="conducted_by">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Conducted By</label><select value={field.state.value || ''} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="">Select...</option>{data?.users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>)}</form.Field>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3"><button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border rounded-xl text-xs font-bold uppercase">Cancel</button><button onClick={form.handleSubmit} className="px-6 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-black uppercase">Save Log</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
