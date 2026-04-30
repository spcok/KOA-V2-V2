import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, Plus, X, Save, MapPin, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const maintenanceSchema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().default('NONE'),
  category: z.enum(['SITE', 'IT', 'EQUIPMENT']).default('SITE'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  location: z.string().default('None'),
  equipment_tag: z.string().default('NONE'),
  assigned_to: z.string().nullable().transform(val => val === '' || !val ? null : val),
});

function MaintenanceModal({ isOpen, onClose, users, editTicket }: { isOpen: boolean, onClose: () => void, users: any[], editTicket?: any }) {
  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const form = useForm({
    defaultValues: { 
      title: editTicket?.title || '', 
      description: editTicket?.description || '', 
      category: editTicket?.category || 'SITE',
      priority: editTicket?.priority || 'MEDIUM',
      location: editTicket?.location || '',
      equipment_tag: editTicket?.equipment_tag || '',
      assigned_to: editTicket?.assigned_to || '', 
    },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      const payload: any = maintenanceSchema.parse(value);
      const uId = currentUserId || null;
      try {
        if (editTicket) {
          await db.query(`UPDATE maintenance_tickets SET title=$1, description=$2, category=$3, priority=$4, location=$5, equipment_tag=$6, assigned_to=$7, modified_by=$8, updated_at=now() WHERE id=$9`, [payload.title, payload.description, payload.category, payload.priority, payload.location, payload.equipment_tag, payload.assigned_to, uId, editTicket.id]);
        } else {
          await db.query(`INSERT INTO maintenance_tickets (title, description, category, priority, location, equipment_tag, assigned_to, reported_by, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8)`, [payload.title, payload.description, payload.category, payload.priority, payload.location, payload.equipment_tag, payload.assigned_to, uId]);
        }
        queryClient.invalidateQueries({ queryKey: ['maintenance'] });
        onClose();
      } catch (err: any) { toast.error(`Error: ${err.message}`); }
    }
  });

  useEffect(() => { if (isOpen) form.reset(); }, [isOpen, editTicket, form]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black tracking-tight text-slate-800 uppercase">{editTicket ? 'Edit Ticket' : 'Log Maintenance Issue'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2"><form.Field name="title">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Issue Title *</label><input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold" /></div>)}</form.Field></div>
             <form.Field name="category">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Category</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold"><option value="SITE">Site / Facilities</option><option value="IT">IT Infrastructure</option><option value="EQUIPMENT">Equipment</option></select></div>)}</form.Field>
             <form.Field name="priority">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Priority</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></div>)}</form.Field>
             <form.Field name="location">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Location</label><input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold" /></div>)}</form.Field>
             <form.Field name="equipment_tag">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Asset Tag</label><input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold" /></div>)}</form.Field>
          </div>
          <form.Field name="description">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Description</label><textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm" /></div>)}</form.Field>
          <form.Field name="assigned_to">{field => (<div><label className="block text-[10px] font-black text-slate-500 uppercase">Assign To</label><select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold"><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}</select></div>)}</form.Field>
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3"><button onClick={onClose} className="px-6 py-2.5 border rounded-xl text-xs font-bold uppercase text-slate-600">Cancel</button><form.Subscribe selector={(state) => [state.canSubmit]}>{([canSubmit]) => (<button onClick={form.handleSubmit} disabled={!canSubmit} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase">Save Ticket</button>)}</form.Subscribe></div>
      </div>
    </div>
  );
}

export function MaintenanceView() {
  const [activeTab, setActiveTab] = useState<'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('OPEN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const usersRes = await db.query("SELECT id, name, email, initials FROM users WHERE is_deleted = false");
      const ticketsRes = await db.query(`SELECT m.*, u1.initials as assigned_initials FROM maintenance_tickets m LEFT JOIN users u1 ON m.assigned_to = u1.id WHERE m.is_deleted = false ORDER BY m.created_at DESC`);
      return { users: usersRes.rows, tickets: ticketsRes.rows };
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => await db.query(`UPDATE maintenance_tickets SET status = $1, updated_at = now() WHERE id = $2`, [newStatus, id]),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance'] })
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: string) => await db.query(`UPDATE maintenance_tickets SET is_deleted = true, updated_at = now() WHERE id = $1`, [id]),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance'] })
  });

  const filteredTickets = data?.tickets?.filter(t => t.status === activeTab) || [];

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Maintenance</h1><button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs"><Plus size={16} className="inline"/> Log Issue</button></div>
      <div className="flex gap-4 border-b border-slate-200">
        {['OPEN', 'IN_PROGRESS', 'RESOLVED'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-3 text-xs font-black uppercase border-b-2 ${activeTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400'}`}>{tab.replace('_', ' ')}</button>
        ))}
      </div>
      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-left min-w-[900px]">
          <thead><tr className="bg-slate-50 border-b"><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Details</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-32">Priority</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-40">Status</th><th className="px-4 py-3 w-20"></th></tr></thead>
          <tbody className="divide-y">
            {filteredTickets.map((t: any) => (
              <tr key={t.id} className="group hover:bg-slate-50">
                <td className="px-4 py-3"><p className="font-bold text-sm text-slate-800">{t.title}</p><span className="text-[10px] font-black text-slate-400 uppercase"><MapPin size={10} className="inline"/> {t.location}</span></td>
                <td className="px-4 py-3"><span className="text-[9px] font-black uppercase border px-2 py-1 rounded-md">{t.priority}</span></td>
                <td className="px-4 py-3">
                    <select value={t.status} onChange={(e) => updateStatus.mutate({ id: t.id, newStatus: e.target.value })} className="text-xs font-bold bg-slate-50 border rounded-lg px-2 py-1">
                        <option value="OPEN">Open</option><option value="IN_PROGRESS">In Progress</option><option value="RESOLVED">Resolved</option>
                    </select>
                </td>
                <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100">
                  <button onClick={() => { setTicketToEdit(t); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => { if(window.confirm('Delete?')) deleteTicket.mutate(t.id); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MaintenanceModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setTicketToEdit(null); }} users={data?.users || []} editTicket={ticketToEdit} />
    </div>
  );
}
