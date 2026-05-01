import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, Plus, X, ShieldAlert, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const isolationSchema = z.object({
  animal_id: z.string().min(1, "Animal required"),
  isolation_type: z.enum(['QUARANTINE_NEW_ARRIVAL', 'QUARANTINE_ILLNESS', 'MEDICAL_INJURY', 'BEHAVIORAL']).default('MEDICAL_INJURY'),
  start_date: z.string().min(1, "Start date required"),
  location: z.string().min(1, "Location required"),
  reason_notes: z.string().default('NONE'),
});

export function IsolationView() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentUserId = useAuthStore(s => s.session?.user?.id) || '00000000-0000-0000-0000-000000000000';

  const { data, isLoading } = useQuery({
    queryKey: ['isolations_master'],
    queryFn: async () => {
      const animalsRes = await db.query("SELECT id, name, species FROM animals WHERE is_deleted = false ORDER BY name");
      const isolationsRes = await db.query(`
        SELECT i.*, a.name as animal_name, a.species, u.name as auth_name 
        FROM isolation_logs i 
        LEFT JOIN animals a ON i.animal_id = a.id 
        LEFT JOIN users u ON i.authorized_by = u.id 
        WHERE i.is_deleted = false 
        ORDER BY i.status ASC, i.start_date DESC
      `);
      return { animals: animalsRes.rows, isolations: isolationsRes.rows };
    }
  });

  const clearIsolationMutation = useMutation({
    mutationFn: async (isolationId: string) => {
      await db.query(`UPDATE isolation_logs SET status = 'CLEARED', end_date = CURRENT_DATE, modified_by = $1, updated_at = now() WHERE id = $2`, [currentUserId, isolationId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isolations_master'] });
      queryClient.invalidateQueries({ queryKey: ['medical_dashboard_data'] });
      toast.success('Isolation Cleared Successfully');
    }
  });

  const form = useForm({
    defaultValues: { animal_id: '', isolation_type: 'MEDICAL_INJURY', start_date: new Date().toISOString().split('T')[0], location: '', reason_notes: '' },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      const p: any = isolationSchema.parse(value);
      try {
        await db.query(
          `INSERT INTO isolation_logs (animal_id, isolation_type, start_date, location, reason_notes, status, authorized_by, created_by, modified_by) 
           VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, $6, $6)`,
          [p.animal_id, p.isolation_type, p.start_date, p.location, p.reason_notes, currentUserId]
        );
        queryClient.invalidateQueries({ queryKey: ['isolations_master'] });
        queryClient.invalidateQueries({ queryKey: ['medical_dashboard_data'] });
        toast.success('Animal Placed in Isolation');
        setIsModalOpen(false);
      } catch (err: any) { toast.error(err.message); }
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><ShieldAlert className="text-rose-500" size={28}/> Biosecurity & Isolations</h1>
        <button onClick={() => { form.reset(); setIsModalOpen(true); }} className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-black uppercase text-xs shadow-lg flex items-center gap-2"><Plus size={16}/> Log Isolation</button>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead><tr className="bg-slate-50 border-b"><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Animal</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Type / Reason</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Location</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Duration</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Status</th><th className="px-4 py-3 w-32"></th></tr></thead>
          <tbody className="divide-y">
            {data?.isolations.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold text-sm">No isolation records found.</td></tr>}
            {data?.isolations.map((i: any) => (
              <tr key={i.id} className={`hover:bg-slate-50 ${i.status === 'ACTIVE' ? 'bg-rose-50/20' : 'opacity-70'}`}>
                <td className="px-4 py-3"><p className="font-bold text-sm text-slate-800">{i.animal_name}</p><span className="text-[10px] font-black text-slate-400 uppercase">{i.species}</span></td>
                <td className="px-4 py-3"><span className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded border mb-1 inline-block">{i.isolation_type.replace(/_/g, ' ')}</span>{i.reason_notes !== 'NONE' && <p className="text-xs text-slate-500 italic mt-1 max-w-xs truncate">"{i.reason_notes}"</p>}</td>
                <td className="px-4 py-3 text-xs font-bold text-slate-700">{i.location}</td>
                <td className="px-4 py-3 text-xs font-bold text-slate-600">{new Date(i.start_date).toLocaleDateString()} - {i.status === 'CLEARED' ? new Date(i.end_date).toLocaleDateString() : 'Present'}</td>
                <td className="px-4 py-3">{i.status === 'ACTIVE' ? <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-100 px-2 py-1 rounded border border-rose-200">Active</span> : <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Cleared</span>}</td>
                <td className="px-4 py-3 text-right">
                    {i.status === 'ACTIVE' && (
                        <button onClick={() => { if(window.confirm('Clear this animal from isolation?')) clearIsolationMutation.mutate(i.id); }} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-[10px] font-black uppercase transition-colors">Clear</button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-center items-center p-4 z-[100]">
          <div className="bg-white rounded-3xl w-full max-w-xl flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b"><h2 className="text-lg font-black uppercase text-rose-900 flex items-center gap-2"><ShieldAlert size={20}/> Restrict Animal (Isolation)</h2><button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-700"/></button></div>
            <div className="p-6 space-y-4">
                <form.Field name="animal_id">{field => (<div><label className="block text-[10px] font-black text-rose-500 uppercase">Select Animal *</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white"><option value="">Select an animal...</option>{data?.animals.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.species})</option>)}</select></div>)}</form.Field>
                <div className="grid grid-cols-2 gap-4">
                    <form.Field name="isolation_type">{field => (<div><label className="block text-[10px] font-black text-rose-500 uppercase">Type *</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="QUARANTINE_NEW_ARRIVAL">Quarantine (New Arrival)</option><option value="QUARANTINE_ILLNESS">Quarantine (Illness)</option><option value="MEDICAL_INJURY">Medical / Injury</option><option value="BEHAVIORAL">Behavioral</option></select></div>)}</form.Field>
                    <form.Field name="start_date">{field => (<div><label className="block text-[10px] font-black text-rose-500 uppercase">Start Date *</label><input type="date" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field>
                </div>
                <form.Field name="location">{field => (<div><label className="block text-[10px] font-black text-rose-500 uppercase">Isolation Location (Enclosure/Pen) *</label><input placeholder="e.g. Vet Block Pen 3" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field>
                <form.Field name="reason_notes">{field => (<div><label className="block text-[10px] font-black text-rose-500 uppercase">Reason / Notes</label><textarea placeholder="Optional notes for the team..." value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
            </div>
            <div className="p-6 border-t flex justify-end gap-3"><button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border rounded-xl text-xs font-bold uppercase text-slate-600">Cancel</button><button onClick={form.handleSubmit} className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black uppercase">Enforce Isolation</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
