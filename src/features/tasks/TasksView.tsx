import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, Plus, CheckCircle, Circle, Clock, User, X, Save, ClipboardList, Wrench, Stethoscope, MapPin, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default('NONE'),
  assigned_to: z.string().nullable().transform(val => val === '' || !val ? null : val),
  due_date: z.string().nullable().transform(val => val === '' || !val ? null : val),
  task_type: z.enum(['GENERAL', 'MAINTENANCE', 'MEDICAL', 'HUSBANDRY']).default('GENERAL'),
  location: z.string().default('None'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
});

function TaskModal({ isOpen, onClose, users, editTask }: { isOpen: boolean, onClose: () => void, users: any[], editTask?: any }) {
  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const form = useForm({
    defaultValues: { 
      title: editTask?.title || '', 
      description: editTask?.description || '', 
      assigned_to: editTask?.assigned_to || '', 
      due_date: editTask?.due_date && editTask.due_date !== '1900-01-01' ? new Date(editTask.due_date).toISOString().split('T')[0] : '', 
      task_type: editTask?.task_type || 'GENERAL',
      location: editTask?.location || '',
      priority: editTask?.priority || 'MEDIUM'
    },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      const payload: any = taskSchema.parse(value);
      const uId = currentUserId || null;
      try {
        if (editTask) {
          await db.query(
            `UPDATE tasks SET title=$1, description=$2, assigned_to=$3, due_date=$4, task_type=$5, location=$6, priority=$7, modified_by=$8, updated_at=now() WHERE id=$9`,
            [payload.title, payload.description, payload.assigned_to, payload.due_date, payload.task_type, payload.location, payload.priority, uId, editTask.id]
          );
          toast.success('Task updated');
        } else {
          await db.query(
            `INSERT INTO tasks (title, description, assigned_to, due_date, task_type, location, priority, created_by, modified_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
            [payload.title, payload.description, payload.assigned_to, payload.due_date, payload.task_type, payload.location, payload.priority, uId]
          );
          toast.success('Task created');
        }
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        onClose();
      } catch (err: any) {
        toast.error(`Database Error: ${err.message}`);
      }
    }
  });

  useEffect(() => { if (isOpen) form.reset(); }, [isOpen, editTask, form]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <h2 className="text-lg font-black tracking-tight text-slate-800 uppercase">{editTask ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2">
                <form.Field name="title">{field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Task Title *</label>
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none" placeholder="e.g., Repair Aviary Netting" />
                  </div>
                )}</form.Field>
             </div>
             <form.Field name="location">{field => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Location</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin size={14} className="text-slate-400"/></div>
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none bg-slate-50" />
                  </div>
                </div>
              )}</form.Field>
              <form.Field name="priority">{field => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Priority</label>
                  <select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none bg-slate-50">
                    <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
                  </select>
                </div>
              )}</form.Field>
          </div>
          <form.Field name="description">{field => (
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Description</label>
              <textarea value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 focus:outline-none bg-slate-50" />
            </div>
          )}</form.Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <form.Field name="task_type">{field => (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Category</label>
                <select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none bg-slate-50">
                  <option value="GENERAL">General</option><option value="HUSBANDRY">Husbandry</option><option value="MAINTENANCE">Maintenance</option><option value="MEDICAL">Medical</option>
                </select>
              </div>
            )}</form.Field>
            <form.Field name="due_date">{field => (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Due Date</label>
                <input type="date" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none bg-slate-50" />
              </div>
            )}</form.Field>
            <form.Field name="assigned_to">{field => (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Assign To</label>
                <select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-emerald-500 focus:outline-none bg-slate-50">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                </select>
              </div>
            )}</form.Field>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-bold uppercase text-xs tracking-widest transition-colors text-slate-600">Cancel</button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <button onClick={form.handleSubmit} disabled={!canSubmit || isSubmitting} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
                </button>
              )}
          </form.Subscribe>
        </div>
      </div>
    </div>
  );
}

export function TasksView() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);
  const currentUserId = useAuthStore(s => s.session?.user?.id);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const usersRes = await db.query("SELECT id, name, email, initials FROM users WHERE is_deleted = false");
      const tasksRes = await db.query(`SELECT t.*, u1.initials as assigned_initials FROM tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id WHERE t.is_deleted = false ORDER BY t.created_at DESC`);
      return { users: usersRes.rows, tasks: tasksRes.rows };
    }
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
      await db.query(`UPDATE tasks SET status = $1, completed_at = ${newStatus === 'COMPLETED' ? 'now()' : 'null'}, completed_by = ${newStatus === 'COMPLETED' ? '$2' : 'null'}, modified_by = $2, updated_at = now() WHERE id = $3`, [newStatus, currentUserId || null, id]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => await db.query(`UPDATE tasks SET is_deleted = true, updated_at = now() WHERE id = $1`, [id]),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const filteredTasks = data?.tasks?.filter(t => t.status === activeTab) || [];

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Tasks</h1>
        <button onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-lg flex items-center gap-2"><Plus size={16}/> Assign Task</button>
      </div>
      <div className="flex border-b border-slate-200">
        <button onClick={() => setActiveTab('PENDING')} className={`px-6 py-3 text-xs font-black uppercase border-b-2 ${activeTab === 'PENDING' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400'}`}>Pending</button>
        <button onClick={() => setActiveTab('COMPLETED')} className={`px-6 py-3 text-xs font-black uppercase border-b-2 ${activeTab === 'COMPLETED' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400'}`}>Completed</button>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="px-4 py-3 w-12"></th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Task Details</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-32">Priority</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-32">Type</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-32">Assigned</th><th className="px-4 py-3 w-20"></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.map((t: any) => (
              <tr key={t.id} className="group hover:bg-slate-50">
                <td className="px-4 py-3 text-center"><button onClick={() => updateTask.mutate({ id: t.id, newStatus: t.status === 'PENDING' ? 'COMPLETED' : 'PENDING' })} className={t.status === 'COMPLETED' ? 'text-emerald-500' : 'text-slate-300'}>{t.status === 'COMPLETED' ? <CheckCircle size={22} /> : <Circle size={22} />}</button></td>
                <td className="px-4 py-3"><p className="font-bold text-sm text-slate-800">{t.title}</p><span className="text-[10px] font-black text-slate-400 uppercase"><MapPin size={10} className="inline"/> {t.location}</span></td>
                <td className="px-4 py-3"><span className="text-[9px] font-black uppercase border px-2 py-1 rounded-md">{t.priority}</span></td>
                <td className="px-4 py-3"><span className="text-[9px] font-black uppercase bg-slate-100 px-2 py-1 rounded-md">{t.task_type}</span></td>
                <td className="px-4 py-3"><span className="text-xs font-bold text-slate-600"><User size={12} className="inline"/> {t.assigned_initials || 'Unassigned'}</span></td>
                <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100">
                  <button onClick={() => { setTaskToEdit(t); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => { if(window.confirm('Delete?')) deleteTask.mutate(t.id); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TaskModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setTaskToEdit(null); }} users={data?.users || []} editTask={taskToEdit} />
    </div>
  );
}
