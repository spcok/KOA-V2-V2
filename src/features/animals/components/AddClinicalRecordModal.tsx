import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { queryClient } from '../../../lib/queryClient';
import { useAuthStore } from '../../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { X, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';

const recordSchema = z.object({
  animal_id: z.string().min(1, "Animal required"),
  record_date: z.string().min(1, "Date required"),
  record_type: z.enum(['VET_EXAM', 'KEEPER_EXAM', 'PROCEDURE', 'EUTHANASIA', 'DECEASED', 'BIRTH']).default('KEEPER_EXAM'),
  conductor_role: z.enum(['KEEPER', 'VET', 'EXTERNAL_SPECIALIST']).default('KEEPER'),
  conducted_by: z.string().default('00000000-0000-0000-0000-000000000000'),
  external_vet_name: z.string().default('N/A'),
  external_vet_clinic: z.string().default('N/A'),
  weight_grams: z.number().min(-1).default(-1),
  soap_subjective: z.string().min(1, "Subjective notes required").default('NONE'),
  soap_objective: z.string().min(1, "Objective notes required").default('NONE'),
  soap_assessment: z.string().min(1, "Assessment required").default('NONE'),
  soap_plan: z.string().min(1, "Plan required").default('NONE'),
});

export function AddClinicalRecordModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const currentUserId = useAuthStore(s => s.session?.user?.id) || '00000000-0000-0000-0000-000000000000';

  const { data: users } = useQuery({
    queryKey: ['users_list'],
    queryFn: async () => {
      const res = await db.query("SELECT id, name FROM users WHERE is_deleted = false");
      return res.rows;
    }
  });

  const { data: animals } = useQuery({
    queryKey: ['animals_list'],
    queryFn: async () => {
      const res = await db.query("SELECT id, name FROM animals WHERE is_deleted = false ORDER BY name");
      return res.rows;
    }
  });

  const form = useForm({
    defaultValues: {
      animal_id: '',
      record_date: new Date().toISOString().slice(0, 16), record_type: 'KEEPER_EXAM',
      conductor_role: 'KEEPER', conducted_by: currentUserId, external_vet_name: 'N/A', external_vet_clinic: 'N/A',
      weight_grams: -1, soap_subjective: '', soap_objective: '', soap_assessment: '', soap_plan: ''
    },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      const p: any = recordSchema.parse(value);
      
      // Enforce zero UUID if external
      const finalConductorId = p.conductor_role === 'EXTERNAL_SPECIALIST' ? '00000000-0000-0000-0000-000000000000' : p.conducted_by;

      try {
        await db.query(
          `INSERT INTO clinical_records (animal_id, record_type, record_date, soap_subjective, soap_objective, soap_assessment, soap_plan, weight_grams, conductor_role, conducted_by, external_vet_name, external_vet_clinic, created_by, modified_by) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
          [p.animal_id, p.record_type, p.record_date, p.soap_subjective, p.soap_objective, p.soap_assessment, p.soap_plan, p.weight_grams, p.conductor_role, finalConductorId, p.external_vet_name, p.external_vet_clinic, currentUserId]
        );

        // Continuity Fix: Dual Insert for Weight into daily_logs
        if (p.weight_grams > 0) {
            await db.query(
                `INSERT INTO daily_logs (animal_id, log_date, weight_grams, notes, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $5)`,
                [p.animal_id, p.record_date, p.weight_grams, `Weight logged via Medical SOAP: ${p.record_type}`, currentUserId]
            );
        }

        queryClient.invalidateQueries({ queryKey: ['animal_medical', p.animal_id] });
        queryClient.invalidateQueries({ queryKey: ['global_clinical_records'] });
        queryClient.invalidateQueries({ queryKey: ['daily_logs'] });
        toast.success('Clinical Record Saved');
        onClose();
      } catch (err: any) { toast.error(err.message); }
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex justify-center items-start pt-10 px-4 z-[100] overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl flex flex-col shadow-2xl mb-10">
        <div className="flex justify-between items-center p-6 border-b"><h2 className="text-lg font-black uppercase text-indigo-900 flex items-center gap-2"><Stethoscope size={20}/> Log Clinical Record (SOAP)</h2><button onClick={onClose}><X className="text-slate-400 hover:text-slate-700"/></button></div>
        
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <form.Field name="animal_id">{field => (<div className="md:col-span-4"><label className="block text-[10px] font-black text-slate-500 uppercase">Select Animal *</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="">Select an animal...</option>{animals?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>)}</form.Field>
                <form.Field name="record_date">{field => (<div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase">Date & Time *</label><input type="datetime-local" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field>
                <form.Field name="record_type">{field => (<div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase">Record Type</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="KEEPER_EXAM">Keeper Exam</option><option value="VET_EXAM">Vet Exam</option><option value="PROCEDURE">Procedure</option><option value="BIRTH">Birth</option><option value="DECEASED">Deceased</option><option value="EUTHANASIA">Euthanasia</option></select></div>)}</form.Field>
            </div>

            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-4">
                <form.Field name="conductor_role">{field => (<div><label className="block text-[10px] font-black text-indigo-500 uppercase">Exam Conducted By Role</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white"><option value="KEEPER">Internal Staff (Keeper/Manager)</option><option value="VET">Internal Vet</option><option value="EXTERNAL_SPECIALIST">External Specialist / Vet</option></select></div>)}</form.Field>
                <form.Subscribe selector={(state) => state.values.conductor_role}>
                    {(role) => role === 'EXTERNAL_SPECIALIST' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <form.Field name="external_vet_name">{field => (<div><label className="block text-[10px] font-black text-indigo-500 uppercase">Vet Name</label><input placeholder="Dr. Smith" value={field.state.value === 'N/A' ? '' : field.state.value} onChange={e => field.handleChange(e.target.value || 'N/A')} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" /></div>)}</form.Field>
                            <form.Field name="external_vet_clinic">{field => (<div><label className="block text-[10px] font-black text-indigo-500 uppercase">Clinic Name</label><input placeholder="City Vets" value={field.state.value === 'N/A' ? '' : field.state.value} onChange={e => field.handleChange(e.target.value || 'N/A')} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" /></div>)}</form.Field>
                        </div>
                    ) : (
                        <form.Field name="conducted_by">{field => (<div><label className="block text-[10px] font-black text-indigo-500 uppercase">Select Staff Member</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white"><option value="00000000-0000-0000-0000-000000000000">Select...</option>{users?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>)}</form.Field>
                    )}
                </form.Subscribe>
            </div>

            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">S.O.A.P. Notes</h3>
                <form.Field name="soap_subjective">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Subjective (History, observations, keeper reports)</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-16 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
                <form.Field name="soap_objective">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Objective (Measurable data, vitals, physical exam findings)</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-16 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
                <form.Field name="soap_assessment">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Assessment (Diagnosis or working diagnosis)</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-16 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
                <form.Field name="soap_plan">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Plan (Treatments, medications, follow-up)</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-16 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
            </div>

            <form.Field name="weight_grams">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Recorded Weight (Grams) - Optional</label><input type="number" placeholder="e.g. 4500 for 4.5kg" value={field.state.value === -1 ? '' : field.state.value} onChange={e => field.handleChange(e.target.value ? Number(e.target.value) : -1)} className="w-full md:w-1/3 px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field>
        </div>
        <div className="p-6 border-t flex justify-end gap-3"><button onClick={onClose} className="px-6 py-2.5 border rounded-xl text-xs font-bold uppercase">Cancel</button><button onClick={form.handleSubmit} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase">Save Record</button></div>
      </div>
    </div>
  );
}
