import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { queryClient } from '../../../lib/queryClient';
import { useAuthStore } from '../../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { X, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';

const schedSchema = z.object({
  animal_id: z.string().min(1, "Animal required"),
  schedule_type: z.enum(['MEDICATION_COURSE', 'VET_CHECK', 'PROCEDURE']).default('MEDICATION_COURSE'),
  title: z.string().min(1, "Title required"),
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().min(1, "End date required"),
  frequency: z.enum(['ONCE', 'DAILY', 'TWICE_DAILY', 'WEEKLY']).default('DAILY'),
});

export function AddClinicalScheduleModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const currentUserId = useAuthStore(s => s.session?.user?.id) || '00000000-0000-0000-0000-000000000000';

  const { data: animals } = useQuery({
    queryKey: ['animals_list'],
    queryFn: async () => {
      const res = await db.query("SELECT id, name FROM animals WHERE is_deleted = false ORDER BY name");
      return res.rows;
    }
  });

  const form = useForm({
    defaultValues: { animal_id: '', schedule_type: 'MEDICATION_COURSE', title: '', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], frequency: 'DAILY' },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      const p: any = schedSchema.parse(value);
      try {
        await db.query(
          `INSERT INTO clinical_schedule (animal_id, schedule_type, title, start_date, end_date, frequency, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
          [p.animal_id, p.schedule_type, p.title, p.start_date, p.end_date, p.frequency, currentUserId]
        );
        queryClient.invalidateQueries({ queryKey: ['animal_medical', p.animal_id] });
        queryClient.invalidateQueries({ queryKey: ['global_clinical_schedule'] });
        toast.success('Schedule Added');
        onClose();
      } catch (err: any) { toast.error(err.message); }
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex justify-center items-center p-4 z-[100]">
      <div className="bg-white rounded-3xl w-full max-w-xl flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b"><h2 className="text-lg font-black uppercase text-indigo-900 flex items-center gap-2"><CalendarClock size={20}/> Schedule Treatment</h2><button onClick={onClose}><X className="text-slate-400 hover:text-slate-700"/></button></div>
        <div className="p-6 space-y-4">
            <form.Field name="animal_id">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Select Animal *</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="">Select an animal...</option>{animals?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>)}</form.Field>
            <form.Field name="schedule_type">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Type</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="MEDICATION_COURSE">Medication Course</option><option value="VET_CHECK">Vet Check</option><option value="PROCEDURE">Procedure</option></select></div>)}</form.Field>
            <form.Field name="title">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Title / Drug Name & Dose</label><input placeholder="e.g. Meloxicam 5ml" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field>
            <div className="grid grid-cols-2 gap-4">
                <form.Field name="start_date">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Start Date</label><input type="date" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field>
                <form.Field name="end_date">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">End Date</label><input type="date" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field>
            </div>
            <form.Field name="frequency">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Frequency</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="ONCE">Once</option><option value="DAILY">Daily</option><option value="TWICE_DAILY">Twice Daily</option><option value="WEEKLY">Weekly</option></select></div>)}</form.Field>
        </div>
        <div className="p-6 border-t flex justify-end gap-3"><button onClick={onClose} className="px-6 py-2.5 border rounded-xl text-xs font-bold uppercase">Cancel</button><button onClick={form.handleSubmit} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase">Schedule</button></div>
      </div>
    </div>
  );
}
