import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, Plus, X, Save, MapPin, AlertTriangle, Edit2, Trash2, Siren, User, HeartPulse, HardHat } from 'lucide-react';
import toast from 'react-hot-toast';

const safetySchema = z.object({
  incident_date: z.string().min(1, "Date required"),
  title: z.string().min(1, "Title required"),
  incident_type: z.enum(['ANIMAL_ESCAPE', 'FIRE', 'NEAR_MISS', 'SECURITY_BREACH', 'INFRASTRUCTURE_FAILURE', 'SEVERE_WEATHER', 'OTHER']).default('OTHER'),
  severity_level: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('LOW'),
  location: z.string().default('NONE'),
  description: z.string().default('NONE'),
  immediate_action_taken: z.string().default('NONE'),
  animal_involved: z.boolean().default(false),
  linked_animal_id: z.string().nullable().transform(val => val === '' || !val ? null : val),
  first_aid_required: z.boolean().default(false),
  root_cause: z.string().default('NONE'),
  preventative_action: z.string().default('NONE'),
  status: z.enum(['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'CLOSED']).default('OPEN'),
  assigned_to: z.string().nullable().transform(val => val === '' || !val ? null : val),
});

function SafetyModal({ isOpen, onClose, users, animals, editIncident }: { isOpen: boolean, onClose: () => void, users: any[], animals: any[], editIncident?: any }) {
  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const form = useForm({
    defaultValues: { 
      incident_date: editIncident?.incident_date ? new Date(editIncident.incident_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      title: editIncident?.title || '', 
      incident_type: editIncident?.incident_type || 'OTHER',
      severity_level: editIncident?.severity_level || 'LOW',
      location: editIncident?.location || '',
      description: editIncident?.description || '',
      immediate_action_taken: editIncident?.immediate_action_taken || '',
      animal_involved: editIncident?.animal_involved || false,
      linked_animal_id: editIncident?.linked_animal_id || '',
      first_aid_required: editIncident?.first_aid_required || false,
      root_cause: editIncident?.root_cause || '',
      preventative_action: editIncident?.preventative_action || '',
      status: editIncident?.status || 'OPEN',
      assigned_to: editIncident?.assigned_to || '', 
    },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      const payload: any = safetySchema.parse(value);
      const uId = currentUserId || null;
      try {
        if (editIncident) {
          await db.query(
            `UPDATE safety_incidents SET incident_date=$1, title=$2, incident_type=$3, severity_level=$4, location=$5, description=$6, immediate_action_taken=$7, animal_involved=$8, linked_animal_id=$9, first_aid_required=$10, root_cause=$11, preventative_action=$12, status=$13, assigned_to=$14, modified_by=$15, updated_at=now() WHERE id=$16`,
            [payload.incident_date, payload.title, payload.incident_type, payload.severity_level, payload.location, payload.description, payload.immediate_action_taken, payload.animal_involved, payload.linked_animal_id, payload.first_aid_required, payload.root_cause, payload.preventative_action, payload.status, payload.assigned_to, uId, editIncident.id]
          );
        } else {
          await db.query(
            `INSERT INTO safety_incidents (incident_date, title, incident_type, severity_level, location, description, immediate_action_taken, animal_involved, linked_animal_id, first_aid_required, root_cause, preventative_action, status, assigned_to, reported_by, created_by, modified_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15, $15)`,
            [payload.incident_date, payload.title, payload.incident_type, payload.severity_level, payload.location, payload.description, payload.immediate_action_taken, payload.animal_involved, payload.linked_animal_id, payload.first_aid_required, payload.root_cause, payload.preventative_action, payload.status, payload.assigned_to, uId]
          );
        }
        queryClient.invalidateQueries({ queryKey: ['safety_incidents'] });
        onClose();
      } catch (err: any) { toast.error(`Error: ${err.message}`); }
    }
  });

  useEffect(() => { if (isOpen) form.reset(); }, [isOpen, editIncident, form]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black tracking-tight text-slate-800 uppercase flex items-center gap-2"><Siren size={20} className="text-orange-500" /> {editIncident ? 'Edit Safety Incident' : 'Log Safety Incident'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="md:col-span-2"><form.Field name="title">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Short Title *</label><input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field></div>
             <form.Field name="incident_date">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Date & Time *</label><input type="datetime-local" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <form.Field name="incident_type">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Type</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="ANIMAL_ESCAPE">Animal Escape</option><option value="FIRE">Fire</option><option value="NEAR_MISS">Near Miss</option><option value="SECURITY_BREACH">Security Breach</option><option value="INFRASTRUCTURE_FAILURE">Infrastructure Failure</option><option value="SEVERE_WEATHER">Severe Weather</option><option value="OTHER">Other</option></select></div>)}</form.Field>
             <form.Field name="severity_level">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Severity</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">CRITICAL (Code Red)</option></select></div>)}</form.Field>
             <form.Field name="location">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Location</label><input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" /></div>)}</form.Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <form.Field name="description">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Description of Incident</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-24 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
             <form.Field name="immediate_action_taken">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Immediate Action Taken (Mitigation)</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-24 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
          </div>

          {/* Flags */}
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-4">
             <div className="flex gap-6 items-center">
                 <form.Field name="animal_involved">{field => (<label className="flex items-center gap-2 text-sm font-bold text-orange-900"><input type="checkbox" checked={field.state.value} onChange={e => field.handleChange(e.target.checked)} className="rounded text-orange-600 focus:ring-orange-500" /> Animal Involved?</label>)}</form.Field>
                 <form.Field name="first_aid_required">{field => (<label className="flex items-center gap-2 text-sm font-bold text-rose-800"><input type="checkbox" checked={field.state.value} onChange={e => field.handleChange(e.target.checked)} className="rounded text-rose-600 focus:ring-rose-500" /> First Aid Required?</label>)}</form.Field>
             </div>
             <form.Subscribe selector={(state) => state.values.animal_involved}>
                {(animalInvolved) => animalInvolved && (
                  <form.Field name="linked_animal_id">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Select Animal</label><select value={field.state.value || ''} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white"><option value="">Select an animal...</option>{animals.map(a => <option key={a.id} value={a.id}>{a.name} ({a.species})</option>)}</select></div>)}</form.Field>
                )}
             </form.Subscribe>
          </div>

          {/* RCA & CAPA */}
          <div className="p-4 border border-slate-200 rounded-xl space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><HardHat size={14}/> Investigation & RCA</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.Field name="root_cause">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Root Cause Analysis</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
                <form.Field name="preventative_action">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Preventative Action (CAPA)</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-slate-50" /></div>)}</form.Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.Field name="status">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Investigation Status</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="OPEN">Open</option><option value="UNDER_INVESTIGATION">Investigating</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></div>)}</form.Field>
                <form.Field name="assigned_to">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Investigating Officer</label><select value={field.state.value || ''} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50"><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}</select></div>)}</form.Field>
              </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3"><button onClick={onClose} className="px-6 py-2.5 border rounded-xl text-xs font-bold uppercase text-slate-600">Cancel</button><form.Subscribe selector={(state) => [state.canSubmit]}>{([canSubmit]) => (<button onClick={form.handleSubmit} disabled={!canSubmit} className="px-6 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-black uppercase">Save Incident</button>)}</form.Subscribe></div>
      </div>
    </div>
  );
}

export function SafetyIncidentView() {
  const [activeTab, setActiveTab] = useState<'OPEN' | 'RESOLVED' | 'CLOSED'>('OPEN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incidentToEdit, setIncidentToEdit] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['safety_incidents'],
    queryFn: async () => {
      const usersRes = await db.query("SELECT id, name, email, initials FROM users WHERE is_deleted = false");
      const animalsRes = await db.query("SELECT id, name, species FROM animals WHERE is_deleted = false ORDER BY name");
      const incidentsRes = await db.query(`SELECT i.*, u1.initials as investigator_initials, a.name as animal_name FROM safety_incidents i LEFT JOIN users u1 ON i.assigned_to = u1.id LEFT JOIN animals a ON i.linked_animal_id = a.id WHERE i.is_deleted = false ORDER BY i.incident_date DESC`);
      return { users: usersRes.rows, animals: animalsRes.rows, incidents: incidentsRes.rows };
    }
  });

  const deleteIncident = useMutation({
    mutationFn: async (id: string) => await db.query(`UPDATE safety_incidents SET is_deleted = true, updated_at = now() WHERE id = $1`, [id]),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['safety_incidents'] })
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => await db.query(`UPDATE safety_incidents SET status = $1, updated_at = now() WHERE id = $2`, [newStatus, id]),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['safety_incidents'] })
  });

  const filteredIncidents = data?.incidents?.filter(i => 
    activeTab === 'OPEN' ? i.status === 'OPEN' || i.status === 'UNDER_INVESTIGATION' : i.status === activeTab
  );

  const getSeverityBadge = (sev: string) => {
    switch(sev) {
        case 'CRITICAL': return 'bg-rose-100 text-rose-700 border-rose-200';
        case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><Siren className="text-orange-500" size={28}/> Safety & General Incidents</h1><button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-black uppercase text-xs"><Plus size={16} className="inline"/> Log Incident</button></div>
      <div className="flex gap-4 border-b border-slate-200">
        <button onClick={() => setActiveTab('OPEN')} className={`px-4 py-3 text-xs font-black uppercase border-b-2 ${activeTab === 'OPEN' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'}`}>Active / Investigating</button>
        <button onClick={() => setActiveTab('RESOLVED')} className={`px-4 py-3 text-xs font-black uppercase border-b-2 ${activeTab === 'RESOLVED' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'}`}>Resolved</button>
        <button onClick={() => setActiveTab('CLOSED')} className={`px-4 py-3 text-xs font-black uppercase border-b-2 ${activeTab === 'CLOSED' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'}`}>Closed</button>
      </div>
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left min-w-[1000px]">
          <thead><tr className="bg-slate-50 border-b"><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Event</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-32">Severity</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-36">Type</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-40">Status</th><th className="px-4 py-3 w-20"></th></tr></thead>
          <tbody className="divide-y">
            {filteredIncidents?.map((i: any) => (
              <tr key={i.id} className="group hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <p className="font-bold text-sm text-slate-800">{i.title}</p>
                    <div className="flex gap-3 text-[9px] font-black text-slate-400 uppercase">
                      <span>{new Date(i.incident_date).toLocaleString()}</span>
                      {i.location !== 'NONE' && <span><MapPin size={10} className="inline"/> {i.location}</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><span className={`text-[9px] font-black uppercase border px-2 py-1 rounded-md ${getSeverityBadge(i.severity_level)}`}>{i.severity_level === 'CRITICAL' ? <AlertTriangle size={10} className="inline"/> : null} {i.severity_level}</span></td>
                <td className="px-4 py-3"><span className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{i.incident_type.replace(/_/g, ' ')}</span></td>
                <td className="px-4 py-3">
                    <select value={i.status} onChange={(e) => updateStatus.mutate({ id: i.id, newStatus: e.target.value })} className="text-xs font-bold bg-slate-50 border rounded-lg px-2 py-1 focus:outline-none focus:border-orange-500">
                        <option value="OPEN">Open</option><option value="UNDER_INVESTIGATION">Investigating</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option>
                    </select>
                </td>
                <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100">
                  <button onClick={() => { setIncidentToEdit(i); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => { if(window.confirm('Delete this record?')) deleteIncident.mutate(i.id); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SafetyModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setIncidentToEdit(null); }} users={data?.users || []} animals={data?.animals || []} editIncident={incidentToEdit} />
    </div>
  );
}
