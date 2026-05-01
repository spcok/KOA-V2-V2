import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, Plus, X, Save, MapPin, AlertTriangle, Edit2, Trash2, ShieldAlert, HeartPulse, User } from 'lucide-react';
import toast from 'react-hot-toast';

const incidentSchema = z.object({
  incident_date: z.string().min(1, "Date/Time required"),
  person_involved_name: z.string().min(1, "Name required"),
  person_type: z.enum(['STAFF', 'VISITOR', 'CONTRACTOR', 'VOLUNTEER']).default('STAFF'),
  location: z.string().default('NONE'),
  incident_description: z.string().default('NONE'),
  injury_details: z.string().default('NONE'),
  treatment_provided: z.string().default('NONE'),
  outcome: z.enum(['RETURNED_TO_NORMAL', 'WENT_HOME', 'HOSPITAL', 'FATAL']).default('RETURNED_TO_NORMAL'),
  is_riddor_reportable: z.boolean().default(false),
  witness_details: z.string().default('NONE'),
  animal_involved: z.boolean().default(false),
  linked_animal_id: z.string().nullable().transform(val => val === '' || !val ? null : val),
  assigned_to: z.string().nullable().transform(val => val === '' || !val ? null : val),
});

function IncidentModal({ isOpen, onClose, users, animals, editIncident }: { isOpen: boolean, onClose: () => void, users: any[], animals: any[], editIncident?: any }) {
  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const form = useForm({
    defaultValues: { 
      incident_date: editIncident?.incident_date ? new Date(editIncident.incident_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      person_involved_name: editIncident?.person_involved_name || '', 
      person_type: editIncident?.person_type || 'STAFF',
      location: editIncident?.location || '',
      incident_description: editIncident?.incident_description || '',
      injury_details: editIncident?.injury_details || '',
      treatment_provided: editIncident?.treatment_provided || '',
      outcome: editIncident?.outcome || 'RETURNED_TO_NORMAL',
      is_riddor_reportable: editIncident?.is_riddor_reportable || false,
      witness_details: editIncident?.witness_details || '',
      animal_involved: editIncident?.animal_involved || false,
      linked_animal_id: editIncident?.linked_animal_id || '',
      assigned_to: editIncident?.assigned_to || '', 
    },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      const payload: any = incidentSchema.parse(value);
      const uId = currentUserId || null;
      try {
        if (editIncident) {
          await db.query(
            `UPDATE incidents SET incident_date=$1, person_involved_name=$2, person_type=$3, location=$4, incident_description=$5, injury_details=$6, treatment_provided=$7, outcome=$8, is_riddor_reportable=$9, witness_details=$10, animal_involved=$11, linked_animal_id=$12, assigned_to=$13, modified_by=$14, updated_at=now() WHERE id=$15`,
            [payload.incident_date, payload.person_involved_name, payload.person_type, payload.location, payload.incident_description, payload.injury_details, payload.treatment_provided, payload.outcome, payload.is_riddor_reportable, payload.witness_details, payload.animal_involved, payload.linked_animal_id, payload.assigned_to, uId, editIncident.id]
          );
          toast.success('Incident updated');
        } else {
          await db.query(
            `INSERT INTO incidents (incident_date, person_involved_name, person_type, location, incident_description, injury_details, treatment_provided, outcome, is_riddor_reportable, witness_details, animal_involved, linked_animal_id, assigned_to, reported_by, created_by, modified_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14, $14)`,
            [payload.incident_date, payload.person_involved_name, payload.person_type, payload.location, payload.incident_description, payload.injury_details, payload.treatment_provided, payload.outcome, payload.is_riddor_reportable, payload.witness_details, payload.animal_involved, payload.linked_animal_id, payload.assigned_to, uId]
          );
          toast.success('Incident logged');
        }
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        onClose();
      } catch (err: any) {
        toast.error(`Database Error: ${err.message}`);
      }
    }
  });

  useEffect(() => { if (isOpen) form.reset(); }, [isOpen, editIncident, form]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black tracking-tight text-slate-800 uppercase flex items-center gap-2"><ShieldAlert size={20} className="text-rose-500" /> {editIncident ? 'Edit Incident' : 'Log New Incident / First Aid'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <form.Field name="incident_date">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Date & Time *</label><input type="datetime-local" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field>
             <form.Field name="person_involved_name">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Person Involved *</label><input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" placeholder="Full Name" /></div>)}</form.Field>
             <form.Field name="person_type">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Status</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="STAFF">Staff</option><option value="VISITOR">Visitor</option><option value="CONTRACTOR">Contractor</option><option value="VOLUNTEER">Volunteer</option></select></div>)}</form.Field>
          </div>

          <form.Field name="location">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Exact Location</label><input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" placeholder="e.g., Walkway outside Lion Enclosure" /></div>)}</form.Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <form.Field name="incident_description">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">How did it happen?</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-24 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
             <form.Field name="injury_details">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Nature of Injury</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-24 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
             <form.Field name="treatment_provided">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">First Aid Provided</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
             <form.Field name="witness_details">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Witnesses (Names/Contacts)</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-4">
             <div className="flex gap-4 items-center">
                 <form.Field name="animal_involved">{field => (<label className="flex items-center gap-2 text-sm font-bold text-orange-900"><input type="checkbox" checked={field.state.value} onChange={e => field.handleChange(e.target.checked)} className="rounded text-orange-600 focus:ring-orange-500" /> Animal Involved?</label>)}</form.Field>
                 <form.Field name="is_riddor_reportable">{field => (<label className="flex items-center gap-2 text-sm font-bold text-rose-800"><input type="checkbox" checked={field.state.value} onChange={e => field.handleChange(e.target.checked)} className="rounded text-rose-600 focus:ring-rose-500" /> HSE / RIDDOR Reportable?</label>)}</form.Field>
             </div>
             
             <form.Subscribe selector={(state) => state.values.animal_involved}>
                {(animalInvolved) => animalInvolved && (
                  <form.Field name="linked_animal_id">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Select Animal</label><select value={field.state.value || ''} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white"><option value="">Select an animal...</option>{animals.map(a => <option key={a.id} value={a.id}>{a.name} ({a.species})</option>)}</select></div>)}</form.Field>
                )}
             </form.Subscribe>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="outcome">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Outcome</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="RETURNED_TO_NORMAL">Returned to normal / work</option><option value="WENT_HOME">Went Home</option><option value="HOSPITAL">Taken to Hospital / A&E</option><option value="FATAL">Fatal</option></select></div>)}</form.Field>
            <form.Field name="assigned_to">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">First Aider / Responder</label><select value={field.state.value || ''} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="">Unknown / None</option>{users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}</select></div>)}</form.Field>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3"><button onClick={onClose} className="px-6 py-2.5 border rounded-xl text-xs font-bold uppercase text-slate-600">Cancel</button><form.Subscribe selector={(state) => [state.canSubmit]}>{([canSubmit]) => (<button onClick={form.handleSubmit} disabled={!canSubmit} className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black uppercase">Secure Log</button>)}</form.Subscribe></div>
      </div>
    </div>
  );
}

export function IncidentView() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'RIDDOR'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incidentToEdit, setIncidentToEdit] = useState<any>(null);
  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const { data, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const usersRes = await db.query("SELECT id, name, email, initials FROM users WHERE is_deleted = false");
      const animalsRes = await db.query("SELECT id, name, species FROM animals WHERE is_deleted = false ORDER BY name");
      const incidentsRes = await db.query(`SELECT i.*, u1.initials as responder_initials, a.name as animal_name FROM incidents i LEFT JOIN users u1 ON i.assigned_to = u1.id LEFT JOIN animals a ON i.linked_animal_id = a.id WHERE i.is_deleted = false ORDER BY i.incident_date DESC`);
      return { users: usersRes.rows, animals: animalsRes.rows, incidents: incidentsRes.rows };
    }
  });

  const deleteIncident = useMutation({
    mutationFn: async (id: string) => await db.query(`UPDATE incidents SET is_deleted = true, updated_at = now() WHERE id = $1`, [id]),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents'] })
  });

  const filteredIncidents = activeTab === 'RIDDOR' ? data?.incidents?.filter(i => i.is_riddor_reportable) : data?.incidents;

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><ShieldAlert className="text-rose-500" size={28}/> Incidents & First Aid</h1><button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-black uppercase text-xs"><Plus size={16} className="inline"/> Log Incident</button></div>
      <div className="flex gap-4 border-b border-slate-200">
        <button onClick={() => setActiveTab('ALL')} className={`px-4 py-3 text-xs font-black uppercase border-b-2 ${activeTab === 'ALL' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-400'}`}>All Incidents</button>
        <button onClick={() => setActiveTab('RIDDOR')} className={`px-4 py-3 text-xs font-black uppercase border-b-2 ${activeTab === 'RIDDOR' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-400'}`}>RIDDOR Reportable</button>
      </div>
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left min-w-[1000px]">
          <thead><tr className="bg-slate-50 border-b"><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-40">Date & Time</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Involved Person</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Nature of Injury</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-32">Outcome</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-24">Flags</th><th className="px-4 py-3 w-20"></th></tr></thead>
          <tbody className="divide-y">
            {filteredIncidents?.map((i: any) => (
              <tr key={i.id} className="group hover:bg-slate-50">
                <td className="px-4 py-3 text-xs font-bold text-slate-600">{new Date(i.incident_date).toLocaleString()}</td>
                <td className="px-4 py-3"><p className="font-bold text-sm text-slate-800">{i.person_involved_name}</p><div className="flex gap-2 text-[9px] font-black text-slate-400 uppercase mt-1"><span className="bg-slate-100 px-1.5 py-0.5 rounded">{i.person_type}</span>{i.location !== 'NONE' && <span><MapPin size={10} className="inline"/> {i.location}</span>}</div></td>
                <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate" title={i.injury_details}>{i.injury_details !== 'NONE' ? i.injury_details : 'No injury reported'}</td>
                <td className="px-4 py-3"><span className={`text-[9px] font-black uppercase border px-2 py-1 rounded-md ${i.outcome === 'HOSPITAL' || i.outcome === 'FATAL' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600'}`}>{i.outcome.replace(/_/g, ' ')}</span></td>
                <td className="px-4 py-3 flex gap-1">
                    {i.is_riddor_reportable && <span title="RIDDOR Reportable" className="p-1 bg-red-100 text-red-600 rounded-md"><AlertTriangle size={14}/></span>}
                    {i.animal_involved && <span title={`Animal Involved: ${i.animal_name || 'Unknown'}`} className="p-1 bg-orange-100 text-orange-600 rounded-md"><HeartPulse size={14}/></span>}
                </td>
                <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100">
                  <button onClick={() => { setIncidentToEdit(i); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => { if(window.confirm('Delete incident log permanently?')) deleteIncident.mutate(i.id); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <IncidentModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setIncidentToEdit(null); }} users={data?.users || []} animals={data?.animals || []} editIncident={incidentToEdit} />
    </div>
  );
}
